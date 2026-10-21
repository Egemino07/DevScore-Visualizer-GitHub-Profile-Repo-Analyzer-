import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";
import type {
  AnalysisPayload,
  ContributionDay,
  GitHubCommit,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRepo,
  GitHubUser,
  PersonaId,
  RepoLanguage,
} from "@/types/github";
import { computeDevScore } from "./devscore";
import { languageColor } from "./card-themes";
import { clamp } from "./utils";

let cachedOctokit: Octokit | null = null;

function getOctokit(token?: string | null): Octokit {
  return new Octokit({
    auth: token ?? process.env.GITHUB_TOKEN ?? undefined,
    request: { timeout: 15_000 },
  });
}

function hasToken() {
  return Boolean(process.env.GITHUB_TOKEN);
}
const GITHUB_COLORS = languageColor; // alias

/* --------------------------- helpers -------------------------------------- */

export function extractUsername(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  // Full GitHub URLs: https://github.com/<user>, /<user>/<repo>
  const urlMatch = raw.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_-]+)(?:\/([A-Za-z0-9_.-]+))?\/?$/i
  );
  if (urlMatch) return decodeURIComponent(urlMatch[1]);
  // strip leading @
  if (raw.startsWith("@")) return raw.slice(1);
  // bare username — normal github usernames are safe charset, reject spaces
  if (/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(raw)) return raw;
  return null;
}

/* -------------------------- core fetchers -------------------------------- */

async function fetchUser(octokit: Octokit, username: string): Promise<GitHubUser> {
  const { data } = await octokit.rest.users.getByUsername({ username });
  return {
    login: data.login,
    id: data.id,
    avatar_url: data.avatar_url,
    name: data.name,
    bio: data.bio,
    company: data.company,
    location: data.location,
    blog: data.blog,
    twitter_username: data.twitter_username ?? null,
    public_repos: data.public_repos,
    public_gists: data.public_gists,
    followers: data.followers,
    following: data.following,
    created_at: data.created_at,
    html_url: data.html_url,
  };
}

const REPO_FETCH_COUNT = 30;

async function fetchRepos(
  octokit: Octokit,
  username: string
): Promise<GitHubRepo[]> {
  const { data } = await octokit.repos.listForUser({
    username,
    sort: "pushed",
    per_page: REPO_FETCH_COUNT,
    direction: "desc",
  });
  return data
    .filter((r) => !r.archived)
    .map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      html_url: r.html_url,
      description: r.description,
      fork: r.fork,
      archived: r.archived ?? false,
      stargazers_count: r.stargazers_count ?? 0,
      watchers_count: r.watchers_count ?? 0,
      open_issues_count: r.open_issues_count ?? 0,
      language: r.language ?? null,
      forks_count: r.forks_count ?? 0,
      created_at: r.created_at ?? new Date(0).toISOString(),
      updated_at: r.updated_at ?? new Date(0).toISOString(),
      pushed_at: r.pushed_at ?? new Date(0).toISOString(),
      size: r.size ?? 0,
      topics: r.topics ?? [],
    }));
}

async function fetchLatestCommits(
  octokit: Octokit,
  username: string,
  limit = 45
): Promise<GitHubCommit[]> {
  const repos = await octokit.repos
    .listForUser({ username, sort: "pushed", per_page: 10, direction: "desc" })
    .then((r) => r.data.filter((d) => !d.fork).slice(0, 10));

  const results: GitHubCommit[] = [];
  await Promise.all(
    repos.slice(0, 5).map(async (repo) => {
      try {
        const { data } = await octokit.repos.listCommits({
          owner: username,
          repo: repo.name,
          per_page: limit,
        });
        for (const c of data) {
          results.push({
            sha: c.sha,
            date: c.commit?.author?.date ?? null,
            repository: repo.name,
          });
        }
        // count commits of these repos via compare trick skipped; approximate
      } catch {
        /* ignore per-repo failures (empty repos 409, etc.) */
      }
    })
  );
  return results
    .filter((c) => c.date)
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());
}

async function fetchPullRequests(
  octokit: Octokit,
  username: string
): Promise<GitHubPullRequest[]> {
  const { data } = await octokit.search
    .issuesAndPullRequests({
      q: `author:${username} type:pr is:public`,
      per_page: 50,
      sort: "updated",
    })
    .catch(() => ({ data: { items: [], total_count: 0 } }));

  return data.items.map((item) => {
    const repoUrl = item.repository_url ?? "";
    const repoName = repoUrl.replace("https://api.github.com/repos/", "");
    return {
      title: item.title,
      state: item.state as "open" | "closed",
      merged: Boolean((item as any).pull_request?.merged_at),
      merged_at: (item as any).pull_request?.merged_at ?? null,
      created_at: item.created_at,
      html_url: item.html_url,
      repoName,
    };
  });
}

async function fetchIssues(octokit: Octokit, username: string): Promise<GitHubIssue[]> {
  try {
    const { data } = await octokit.search.issuesAndPullRequests({
      q: `author:${username} type:issue is:public`,
      per_page: 30,
      sort: "updated",
    });
    return data.items
      .filter((item) => !item.pull_request)
      .map((item) => ({
        title: item.title,
        state: item.state as "open" | "closed",
        created_at: item.created_at,
        html_url: item.html_url,
        repository_url: item.repository_url,
      }));
  } catch {
    return [];
  }
}

/* ----------------------- contributions via GraphQL ------------------------ */

const CONTRIB_QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

async function fetchContributions(
  token: string | undefined,
  username: string
): Promise<ContributionDay[]> {
  const authToken = token ?? process.env.GITHUB_TOKEN ?? undefined;
  if (!authToken) return []; // GraphQL requires auth, skip silently
  try {
    const res: any = await graphql(CONTRIB_QUERY, {
      login: username,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });
    const weeks = res.user.contributionsCollection.contributionCalendar.weeks;
    const days: ContributionDay[] = [];
    for (const week of weeks) {
      for (const day of week.contributionDays) {
        days.push({
          date: day.date.slice(0, 10),
          count: day.contributionCount,
          level: levelFor(day.contributionCount),
        });
      }
    }
    return days;
  } catch {
    return [];
  }
}

function levelFor(count: number): ContributionDay["level"] {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 12) return 3;
  return 4;
}

export function computeStreaks(days: ContributionDay[]) {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let curr = 0;
  let longest = 0;
  let run = 0;
  // longest streak
  for (const d of sorted) {
    if (d.count > 0) {
      run += 1;
      longest = Math.max(longest, run);
    } else run = 0;
  }
  // current streak (walking back from the last day that has commits)
  const today = new Date().toISOString().slice(0, 10);
  const dates = new Set(sorted.map((d) => d.date));
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].count > 0) curr += 1;
    else if (new Date(sorted[i].date + "T12:00:00Z").getTime() > Date.now() - 26 * 3600_000) {
      continue; // today may simply not have data yet; keep streak alive
    } else break;
  }
  // current streak uses count>0 while newest day might be a future padded day
  return { currentStreak: Math.max(curr, dates.has(today) ? 0 : curr), longestStreak: longest };
}

export function computeLanguageBreakdown(repos: GitHubRepo[]): RepoLanguage[] {
  // weighted by repo size so heavyweight code dominates the donut
  const totals = new Map<string, number>();
  let sum = 0;
  for (const repo of repos) {
    if (repo.fork || !repo.language || repo.size <= 0) continue;
    const weight = Math.sqrt(repo.size);
    totals.set(repo.language, (totals.get(repo.language) ?? 0) + weight);
    sum += weight;
  }
  if (sum === 0) return [];
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, weight]) => ({
      name,
      percentage: (weight / sum) * 100,
      color: languageColor(name),
    }));
}

export function commitHourHistogram(commits: GitHubCommit[]): number[] {
  const hist = new Array(24).fill(0);
  for (const c of commits) {
    if (!c.date) continue;
    // GitHub commits are UTC; approximate local with UTC-4 (US-ish) is naive.
    // For the persona signal, shift by -4 is a reasonable heuristic.
    const hour = (new Date(c.date).getUTCHours() - 4 + 24) % 24;
    hist[hour] += 1;
  }
  return hist;
}

/* --------------------------- main analyze fn ------------------------------ */

export interface AnalyzeOptions {
  token?: string | null;
}

export async function analyzeUser(
  inputRaw: string,
  opts: AnalyzeOptions = {}
): Promise<AnalysisPayload | { username: string; notFound: true }> {
  const username = extractUsername(inputRaw);
  if (!username) return { username: inputRaw, notFound: true };

  const octokit = getOctokit(opts.token);
  try {
    const user = await fetchUser(octokit, username);

    const [repos, commits, pullRequests, issues] = await Promise.all([
      fetchRepos(octokit, username).catch(() => [] as GitHubRepo[]),
      fetchLatestCommits(octokit, username).catch(() => [] as GitHubCommit[]),
      fetchPullRequests(octokit, username).catch(() => [] as GitHubPullRequest[]),
      fetchIssues(octokit, username).catch(() => [] as GitHubIssue[]),
    ]);

    const contributions = await fetchContributions(
      opts.token ?? undefined,
      username
    );
    let rateLimited = false;

    if (contributions.length === 0) {
      // Either this account has no contribution calendar (very sparse user) or
      // the GraphQL call failed on rate limit. Do NOT fall back to mock data here;
      // proceed gracefully with zeroed contributions.
      rateLimited = !hasToken();
    }

    const contributions90 = contributions.slice(-91);
    const streaks = computeStreaks(contributions90);

    const originalRepos = repos.filter((r) => !r.fork);
    const stars = originalRepos.reduce((s, r) => s + r.stargazers_count, 0);
    const forksTotal = originalRepos.reduce((s, r) => s + r.forks_count, 0);

    const prsMerged = (await octokit.search
      .issuesAndPullRequests({
        q: `author:${username} type:pr is:merged is:public`,
        per_page: 1,
      })
      .then((r) => r.data.total_count)
      .catch(() => pullRequests.filter((pr) => pr.merged).length));

    const issuesTotal = (await octokit.search
      .issuesAndPullRequests({
        q: `author:${username} type:issue is:public`,
        per_page: 1,
      })
      .then((r) => r.data.total_count)
      .catch(() => issues.length));

    const languages = computeLanguageBreakdown(repos);
    const commitHours = commitHourHistogram(commits);

    const topRepos = [...originalRepos]
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5);

    const totals = {
      commits: Math.max(
        contributions.reduce((s, d) => s + d.count, 0),
        commits.length
      ),
      stars,
      prsMerged,
      prsOpened: Math.max(pullRequests.length, 0),
      issuesOpened: issuesTotal,
      forksTotal,
      originalRepos: originalRepos.length,
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
    };

    const partial =
      repos.length === 0 ||
      commits.length === 0 ||
      contributions.length === 0;

    const base: AnalysisPayload = {
      user,
      repos,
      topRepos,
      languages,
      commits,
      pullRequests,
      issues,
      contributions: contributions90,
      commitHours,
      totals,
      devScore: {
        score: 0,
        grade: "E",
        breakdown: {
          commitFrequency: 0,
          prActivity: 0,
          starRatio: 0,
          streak: 0,
          raw: 0,
        },
        details: { pillars: [] },
        persona: {
          id: "lone-wolf",
          title: "Lone Wolf",
          emoji: "🐺",
          description: "",
          color: "#94a3b8",
        },
      },
      meta: {
        fetchedAt: new Date().toISOString(),
        isMock: false,
        rateLimited,
        partial,
      },
    };

    base.devScore = computeDevScore(base);
    return base;
  } catch (err: any) {
    if (err?.status === 404) {
      return { username, notFound: true };
    }
    if (err?.status === 403 || err?.status === 429) {
      // rate limited → mock data fallback
      return getMockAnalysis(username, true);
    }
    throw err;
  }
}

/* ----------------------------- mock fallback ------------------------------ */

export function getMockAnalysis(username: string, fromRateLimit: boolean): AnalysisPayload {
  const mockUser: GitHubUser = {
    login: username,
    id: 1,
    avatar_url: `https://api.dicebear.com/9.x/bottts-neutral/png?seed=${encodeURIComponent(username)}`,
    name: username,
    bio: "GitHub API rate limit reached — showing sample data. Add a GITHUB_TOKEN for live data.",
    company: null,
    location: null,
    blog: null,
    twitter_username: null,
    public_repos: 18,
    public_gists: 4,
    followers: 1240,
    following: 96,
    created_at: new Date(Date.now() - 3 * 365 * 86_400_000).toISOString(),
    html_url: `https://github.com/${username}`,
  };

  const mockRepos: GitHubRepo[] = [...Array(6)].map((_, i) => ({
    id: i + 1,
    name: ["meteor-api", "neon-ui", "rust-scripts", "gradle-plus", "walletd", "cookie-data"][i],
    full_name: `${username}/repo-${i + 1}`,
    html_url: `https://github.com/${username}/repo-${i + 1}`,
    description: "Sample repository (rate-limited fallback)",
    fork: i === 3,
    archived: false,
    stargazers_count: [421, 188, 96, 54, 32, 500][i],
    watchers_count: 1,
    open_issues_count: [8, 3, 12, 0, 1, 20][i],
    language: ["TypeScript", "Go", "Rust", "Python", "JavaScript", "TypeScript"][i],
    forks_count: [72, 38, 12, 9, 4, 31][i],
    created_at: new Date(Date.now() - 400 * 86_400_000).toISOString(),
    updated_at: new Date().toISOString(),
    pushed_at: new Date().toISOString(),
    size: 48_000,
    topics: [],
  }));

  const contributions: ContributionDay[] = [...Array(91)].map((_, i) => {
    const date = new Date(Date.now() - (90 - i) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const weekend = [0, 6].includes(new Date(date).getDay());
    const base = weekend ? 1 : 6;
    const count = Math.random() > 0.85 ? 0 : Math.floor(base * (0.6 + Math.random() * 1.6));
    return { date, count, level: levelFor(count) };
  });

  const streaks = computeStreaks(contributions);
  const originalRepos = mockRepos.filter((r) => !r.fork);

  const languages: RepoLanguage[] = [
    { name: "TypeScript", percentage: 34.2, color: languageColor("TypeScript") },
    { name: "Rust", percentage: 22.1, color: languageColor("Rust") },
    { name: "Go", percentage: 18.9, color: languageColor("Go") },
    { name: "Python", percentage: 12.4, color: languageColor("Python") },
    { name: "JavaScript", percentage: 7.2, color: languageColor("JavaScript") },
    { name: "Shell", percentage: 5.2, color: languageColor("Shell") },
  ];

  const commitHours = [0,1,0,1,0,3,5,2,1,2,3,2,4,3,2,4,5,2,3,6,7,9,4,2];

  const pullRequests: GitHubPullRequest[] = [...Array(24)].map((_, i) => ({
    title: `feat: sample PR #${i + 1}`,
    state: i % 5 === 0 ? "open" : "closed",
    merged: i % 5 !== 0,
    merged_at: i % 5 !== 0 ? new Date().toISOString() : null,
    created_at: new Date(Date.now() - i * 7 * 86_400_000).toISOString(),
    html_url: `https://github.com/sample/pull/${i + 1}`,
    repoName: "sample/repo",
  }));

  const issues: GitHubIssue[] = [...Array(11)].map((_, i) => ({
    title: `fix: sample issue #${i + 1}`,
    state: i % 3 === 0 ? "open" : "closed",
    created_at: new Date(Date.now() - i * 5 * 86_400_000).toISOString(),
    html_url: `https://github.com/sample/issue/${i + 1}`,
    repository_url: "https://api.github.com/repos/sample/repo",
  }));

  const commits: GitHubCommit[] = [...Array(60)].map((_, i) => ({
    sha: `mock${i}`,
    date: new Date(Date.now() - i * 5 * 86_400_000).toISOString(),
    repository: "repo-1",
  }));

  const payload: AnalysisPayload = {
    user: mockUser,
    repos: mockRepos,
    topRepos: originalRepos.sort(
      (a, b) => b.stargazers_count - a.stargazers_count
    ).slice(0, 5),
    languages,
    commits,
    pullRequests,
    issues,
    contributions,
    commitHours,
    totals: {
      commits: 1840,
      stars: originalRepos.reduce((s, r) => s + r.stargazers_count, 0),
      prsMerged: 96,
      prsOpened: 24,
      issuesOpened: 41,
      forksTotal: 166,
      originalRepos: originalRepos.length,
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
    },
    devScore: {
      score: 0,
      grade: "E",
      breakdown: {
        commitFrequency: 0,
        prActivity: 0,
        starRatio: 0,
        streak: 0,
        raw: 0,
      },
      details: { pillars: [] },
      persona: {
        id: "lone-wolf" as PersonaId,
        title: "Lone Wolf",
        emoji: "🐺",
        description: "",
        color: "#94a3b8",
      },
    },
    meta: {
      fetchedAt: new Date().toISOString(),
      isMock: true,
      rateLimited: fromRateLimit,
      partial: true,
    },
  };

  payload.devScore = computeDevScore(payload);
  return payload;
}
