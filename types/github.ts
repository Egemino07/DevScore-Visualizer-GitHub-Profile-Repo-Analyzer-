/**
 * Core types for the DevScore Visualizer.
 * Shared between the GitHub data-fetching service, the DevScore
 * scoring algorithm, the API routes and the UI components.
 */

/* ------------------------------- Raw GitHub ------------------------------ */

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  html_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  stargazers_count: number;
  watchers_count: number;
  open_issues_count: number;
  language: string | null;
  forks_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  topics: string[];
}

export interface GitHubPullRequest {
  title: string;
  state: "open" | "closed";
  merged: boolean;
  merged_at: string | null;
  created_at: string;
  html_url: string;
  repository_url?: string;
  repoName?: string;
  additions?: number;
  deletions?: number;
}

export interface GitHubIssue {
  title: string;
  state: "open" | "closed";
  created_at: string;
  html_url: string;
  repository_url?: string;
}

export interface GitHubCommit {
  sha: string;
  date: string | null;
  repository: string;
}

export interface ContributionDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface RepoLanguage {
  name: string;
  percentage: number;
  color: string;
}

/* ------------------------------ DevScore Core ---------------------------- */

export interface ScoreBreakdown {
  /** 0..100 for each pillar */
  commitFrequency: number;
  prActivity: number;
  starRatio: number;
  streak: number;
  /** Weighted raw contribution (0..40) */
  raw: number;
}

export interface ScoreDetail {
  /** pillar label, points earned of max, weight */
  pillars: Array<{
    label: string;
    earned: number;
    max: number;
    weight: number;
    detail: string;
  }>;
}

export interface DevScoreResult {
  score: number; // 0-100
  grade: string; // S+, S, A, B, C, D
  breakdown: ScoreBreakdown;
  details: ScoreDetail;
  persona: Persona;
}

export type PersonaId =
  | "night-owl"
  | "early-bird"
  | "pr-machine"
  | "bug-hunter"
  | "repo-hoarder"
  | "streak-master"
  | "community-favorite"
  | "lone-wolf"
  | "polyglot";

export interface Persona {
  id: PersonaId;
  title: string;
  emoji: string;
  description: string;
  color: string; // hex accent
}

/* ----------------------------- Analysis Payload -------------------------- */

export interface AnalysisPayload {
  user: GitHubUser;
  repos: GitHubRepo[];
  topRepos: GitHubRepo[];
  languages: RepoLanguage[];
  commits: GitHubCommit[];
  pullRequests: GitHubPullRequest[];
  issues: GitHubIssue[];
  contributions: ContributionDay[]; // last ~90 days used for heatmap/summary
  /** 24-length histogram of local commit hours */
  commitHours: number[];
  totals: {
    commits: number;
    stars: number;
    prsMerged: number;
    prsOpened: number;
    issuesOpened: number;
    forksTotal: number;
    originalRepos: number;
    currentStreak: number;
    longestStreak: number;
  };
  devScore: DevScoreResult;
  meta: {
    fetchedAt: string;
    isMock: boolean; // true when fallback mock data was used
    rateLimited: boolean;
    partial: boolean;
  };
}

/* --------------------------------- Cards -------------------------------- */

export type CardThemeId =
  | "github-dark"
  | "dracula"
  | "cyberpunk"
  | "nord"
  | "one-dark";

export interface CardTheme {
  id: CardThemeId;
  name: string;
  bg: string; // background (supports gradient css string for preview)
  bgSolid: string; // solid hex used for svg/og export
  text: string;
  subtext: string;
  accent: string;
  accent2: string;
  border: string;
  chipBg: string;
}

export type CardLanguage = "markdown" | "png" | "svg";

export interface CardDesignState {
  theme: CardThemeId;
  username: string;
  showDevScore: boolean;
  showLanguages: boolean;
  showPersona: boolean;
  showTopRepos: boolean;
}
