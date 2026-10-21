import type {
  AnalysisPayload,
  DevScoreResult,
  Persona,
  PersonaId,
} from "@/types/github";
import { clamp } from "./utils";

/**
 * DevScore Algorithm — 0..100 combined developer-activity score.
 *
 * Pillars (weights):
 *  1. Commit Frequency  (30%) — recent commit momentum
 *  2. PR Activity       (25%) — pull requests opened/merged + merge rate
 *  3. Star Power        (25%) — stars per repo + total star/follower signal
 *  4. Streaks           (20%) — current + longest contribution streaks
 */

const COMMIT_LOG_CAP = 3000; // commit signal saturates at this value

function logScale(value: number, cap: number): number {
  return clamp((Math.log10(value + 1) / Math.log10(cap + 1)) * 100, 0, 100);
}

function normalize(value: number, max: number): number {
  return clamp((value / max) * 100, 0, 100);
}

function pctRound(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeDevScore(data: AnalysisPayload): DevScoreResult {
  const { totals, pullRequests, user, commits } = data;

  /* ------------------------ 1. Commit frequency (30) -------------------- */
  const yearAgo = Date.now() - 365 * 86_400_000;
  const recentCommits = commits.filter(
    (c) => c.date && new Date(c.date).getTime() > yearAgo
  ).length;
  const commitSignal = Math.max(recentCommits, totals.commits * 0.35);
  const commitFrequency = logScale(commitSignal, COMMIT_LOG_CAP);

  /* ---------------------------- 2. PR activity (25) --------------------- */
  const merged =
    pullRequests.filter((pr) => pr.merged).length + totals.prsMerged;
  const opened = Math.max(pullRequests.length, totals.prsOpened);
  const mergeRate = opened > 0 ? clamp(merged / opened, 0, 1) : 0.35;
  const prScore = clamp(
    normalize(merged, 220) * 0.65 + mergeRate * 35 + (opened > 0 ? 5 : 0),
    0,
    100
  );

  /* ---------------------------- 3. Star power (25) ---------------------- */
  const originalRepos = Math.max(totals.originalRepos, 1);
  const avgStarsPerRepo = totals.stars / originalRepos;
  const starSignal = totals.stars + user.followers * 0.5;
  const starScore =
    logScale(avgStarsPerRepo, 800) * 0.6 + logScale(starSignal, 12_000) * 0.4;

  /* ---------------------------- 4. Streaks (20) ------------------------- */
  const curr = totals.currentStreak;
  const longest = Math.max(totals.longestStreak, curr);
  const streakScore =
    normalize(curr, 45) * 0.55 + normalize(longest, 120) * 0.45;

  /* --------------------------- Weighted sum ----------------------------- */
  const pillars: DevScoreResult["details"]["pillars"] = [
    {
      label: "Commit Frequency",
      earned: pctRound((commitFrequency / 100) * 30),
      max: 30,
      weight: 0.3,
      detail: `${pctRound(commitSignal)} commit signal (last ~365d)`,
    },
    {
      label: "PR Activity",
      earned: pctRound((prScore / 100) * 25),
      max: 25,
      weight: 0.25,
      detail: `${merged} merged PRs · ${pctRound(mergeRate * 100)}% merge rate`,
    },
    {
      label: "Star Power",
      earned: pctRound((starScore / 100) * 25),
      max: 25,
      weight: 0.25,
      detail: `${pctRound(avgStarsPerRepo)} avg stars/repo`,
    },
    {
      label: "Streaks",
      earned: pctRound((streakScore / 100) * 20),
      max: 20,
      weight: 0.2,
      detail: `${curr}d current streak · ${longest}d record`,
    },
  ];

  const raw = pillars.reduce((sum, p) => sum + p.earned, 0);
  const score = clamp(Math.round(raw), 0, 100);

  return {
    score,
    grade: gradeFor(score),
    breakdown: {
      commitFrequency: pctRound(commitFrequency),
      prActivity: pctRound(prScore),
      starRatio: pctRound(starScore),
      streak: pctRound(streakScore),
      raw,
    },
    details: { pillars },
    persona: detectPersona(data),
  };
}

function gradeFor(score: number): string {
  if (score >= 95) return "S+";
  if (score >= 88) return "S";
  if (score >= 76) return "A";
  if (score >= 62) return "B";
  if (score >= 45) return "C";
  if (score >= 28) return "D";
  return "E";
}

/* ------------------------------ Personas -------------------------------- */

export const PERSONAS: Record<PersonaId, Persona> = {
  "night-owl": {
    id: "night-owl",
    title: "Night Owl Coder",
    emoji: "🦉",
    description:
      "Ships most commits after 10 PM. The darkest hours produce the best code.",
    color: "#a78bfa",
  },
  "early-bird": {
    id: "early-bird",
    title: "Early Bird",
    emoji: "🌅",
    description:
      "Commits before the coffee fuels the rest of the world. 6 AM deploy crew.",
    color: "#fbbf24",
  },
  "pr-machine": {
    id: "pr-machine",
    title: "PR Machine",
    emoji: "🤖",
    description:
      "Opens and merges pull requests relentlessly. The pipeline never sleeps.",
    color: "#22d3ee",
  },
  "bug-hunter": {
    id: "bug-hunter",
    title: "Bug Hunter",
    emoji: "🐛",
    description: "Files and crushes issue after issue. QA in human form.",
    color: "#34d399",
  },
  "repo-hoarder": {
    id: "repo-hoarder",
    title: "Repo Hoarder",
    emoji: "📦",
    description: "Dozens of repositories and counting. Every idea becomes a repo.",
    color: "#f472b6",
  },
  "streak-master": {
    id: "streak-master",
    title: "Streak Master",
    emoji: "🔥",
    description:
      "Contribution graph completely green. Consistency is the superpower.",
    color: "#fb923c",
  },
  "community-favorite": {
    id: "community-favorite",
    title: "Community Favorite",
    emoji: "⭐",
    description:
      "Stars, followers and forks — people love what this dev builds.",
    color: "#facc15",
  },
  "lone-wolf": {
    id: "lone-wolf",
    title: "Lone Wolf",
    emoji: "🐺",
    description:
      "Quiet but focused. Few high-impact contributions at their own pace.",
    color: "#94a3b8",
  },
  polyglot: {
    id: "polyglot",
    title: "Polyglot",
    emoji: "🌍",
    description:
      "Speaks fluent Rust, TypeScript, Go and Python in the same week.",
    color: "#38bdf8",
  },
};

/**
 * Hero persona = the strongest normalised signal; defaults to Lone Wolf.
 * Night/early birds use the 24h commit-hour histogram,
 * "night" = hours >= 20 || < 5, "early" = 5..8.
 */
export function detectPersona(data: AnalysisPayload): Persona {
  const { pullRequests, totals, issues, languages, commitHours } = data;

  const merged =
    pullRequests.filter((pr) => pr.merged).length + totals.prsMerged;

  const restHours = commitHours.slice(9, 20);
  const restTotal = restHours.reduce((a, b) => a + b, 0);
  const night =
    commitHours.slice(20).reduce((a, b) => a + b, 0) +
    commitHours.slice(0, 5).reduce((a, b) => a + b, 0);
  const early = commitHours.slice(5, 9).reduce((a, b) => a + b, 0);
  const dayTotal = Math.max(night + early + restTotal, 1);

  const issuesOpened = issues.length + totals.issuesOpened;
  const originalRepos = Math.max(totals.originalRepos, 1);

  const candidates: Array<{ id: PersonaId; strength: number }> = [
    { id: "pr-machine", strength: merged / 60 },
    { id: "night-owl", strength: (night / dayTotal - 0.15) * 2.4 },
    { id: "early-bird", strength: (early / dayTotal - 0.1) * 2.4 },
    { id: "bug-hunter", strength: issuesOpened / 120 },
    { id: "repo-hoarder", strength: originalRepos / 60 },
    { id: "streak-master", strength: totals.longestStreak / 90 },
    { id: "community-favorite", strength: totals.stars / 4000 },
    {
      id: "polyglot",
      strength: (languages.length / 9) * clamp(originalRepos / 15, 0.2, 1.2),
    },
    { id: "lone-wolf", strength: 0.2 },
  ];

  const winner = candidates.sort((a, b) => b.strength - a.strength)[0];
  return PERSONAS[winner.id];
}
