import { NextRequest, NextResponse } from "next/server";
import { analyzeUser, getMockAnalysis } from "@/lib/github-service";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw);

  try {
    const result = await analyzeUser(username);

    if ("notFound" in result && result.notFound) {
      return NextResponse.json(
        { error: "user_not_found", message: `GitHub user "${result.username}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err: any) {
    if (String(err?.status) === "403") {
      // belt-and-braces: return mock payload rather than erroring
      return NextResponse.json(getMockAnalysis(username, true), { status: 200 });
    }
    return NextResponse.json(
      {
        error: "analysis_failed",
        message: err?.message ?? "Unable to analyze this user right now.",
      },
      { status: 500 }
    );
  }
}
