import { NextRequest, NextResponse } from "next/server";
import { analyzeUser, getMockAnalysis } from "@/lib/github-service";
import { buildCardSvg } from "@/lib/card-svg";
import type { CardDesignState, CardThemeId } from "@/types/github";
import { THEME_ORDER } from "@/lib/card-themes";

export const runtime = "nodejs";

const SVG_HEADERS: Record<string, string> = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=3600, s-maxage=86400",
};

/**
 * Inline the avatar as a base64 data URI so the SVG (rendered inside an
 * <img> tag or on GitHub via camo) never needs external image fetches —
 * external <image> hrefs are blocked by SVG security policy in those contexts.
 * Returns null on failure so the renderer draws its inline fallback icon.
 */
async function toAvatarDataUri(url: string | undefined): Promise<string | null> {
  const src = url?.trim();
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  try {
    const res = await fetch(src, {
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "DevScore-Visualizer" },
    });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "image/png").split(";")[0];
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // 0 bytes → broken; >2 MB → don't bloat the SVG
    if (buf.length === 0 || buf.length > 2 * 1024 * 1024) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Strict show parsing. Only the four known tokens enable sections. */
function parseShows(search: URLSearchParams): {
  score: boolean;
  langs: boolean;
  persona: boolean;
  repos: boolean;
} {
  const raw = (search.get("show") ?? "score,langs,persona,repos").toLowerCase();
  const shows = new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  // "none" (or an empty set) means everything off
  if (shows.has("none") || shows.size === 0) {
    return { score: false, langs: false, persona: false, repos: false };
  }
  return {
    score: shows.has("score"),
    langs: shows.has("langs"),
    persona: shows.has("persona"),
    repos: shows.has("repos"),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw);
  const shows = parseShows(req.nextUrl.searchParams);
  const themeId =
    THEME_ORDER.find((t) => t === req.nextUrl.searchParams.get("theme")) ??
    "github-dark";

  const design: CardDesignState = {
    theme: themeId as CardThemeId,
    username,
    showDevScore: shows.score,
    showLanguages: shows.langs,
    showPersona: shows.persona,
    showTopRepos: shows.repos,
  };

  try {
    const result = await analyzeUser(username);
    if ("notFound" in result) {
      return NextResponse.json(
        { error: "user_not_found" },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const avatarDataUri = await toAvatarDataUri(result.user.avatar_url);
    const svg = buildCardSvg(result, design, avatarDataUri);
    return new NextResponse(svg, { headers: SVG_HEADERS });
  } catch {
    const mock = getMockAnalysis(username, true);
    const avatarDataUri = await toAvatarDataUri(mock.user.avatar_url);
    const svg = buildCardSvg(mock, design, avatarDataUri);
    return new NextResponse(svg, { headers: SVG_HEADERS });
  }
}
