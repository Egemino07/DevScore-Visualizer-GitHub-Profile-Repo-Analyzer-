export const routes = {
  analyze: (username: string) => `/analyze/${encodeURIComponent(username)}`,
  analyzeApi: (username: string) => `/api/analyze/${encodeURIComponent(username)}`,
  og: (username: string) => `/api/og/${encodeURIComponent(username)}`,
  home: "/",
} as const;
