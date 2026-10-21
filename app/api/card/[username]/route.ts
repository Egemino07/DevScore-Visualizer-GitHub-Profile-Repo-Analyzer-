import { NextRequest, NextResponse } from "next/server";
import { analyzeUser, getMockAnalysis } from "@/lib/github-service";
import { buildCardSvg } from "@/lib/card-svg";
import type { CardDesignState, CardThemeId } from "@/types/github";
import { THEME_ORDER } from "@/lib/card-themes";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw);
  const search = req.nextUrl.searchParams;

  const shows = (search.get("show") ?? "score,langs,persona,repos")
    .split(",")
    .map((s) => s.trim());
  const theme = THEME_ORDER.find((t) => t === search.get("theme")) ?? "github-dark";

  const design: CardDesignState = {
    theme: theme as CardThemeId,
    username,
    showDevScore: shows.includes("score"),
    showLanguages: shows.includes("langs"),
    showPersona: shows.includes("persona"),
    showTopRepos: shows.includes("repos"),
  };

  try {
    const result = await analyzeUser(username);
    if ("notFound" in result) {
      return NextResponse.json(
        { error: "user_not_found" },
        { status: 404 }
      );
    }

    const svg = buildCardSvg(result, design);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    const svg = buildCardSvg(getMockAnalysis(username, true), design);
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
}
