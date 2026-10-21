import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { analyzeUser, getMockAnalysis } from "@/lib/github-service";
import { Dashboard } from "@/components/dashboard";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { CardGenerator } from "@/components/card-generator";
import { SearchBar } from "@/components/search-bar";
import type { AnalysisPayload } from "@/types/github";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw);
  return {
    title: `${username} · DevScore Visualizer`,
    openGraph: {
      title: `@${username} — DevScore`,
      description: `Analyze @${username}'s GitHub activity and DevScore rating.`,
    },
  };
}

async function AnalysisSection({ username }: { username: string }) {
  let payload: AnalysisPayload | null = null;
  let notFound = false;

  try {
    const result = await analyzeUser(username);
    if ("notFound" in result) notFound = true;
    else payload = result;
  } catch {
    payload = getMockAnalysis(username, true);
  }

  if (notFound) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">👻</div>
        <h2 className="text-xl font-semibold text-white">
          GitHub user &quot;{username}&quot; not found
        </h2>
        <p className="mt-2 text-slate-400 text-sm">
          Check the spelling and try again.
        </p>
      </div>
    );
  }

  return <Dashboard payload={payload!} />;
}

export default async function AnalyzePage({ params }: PageProps) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw);

  return (
    <main className="min-h-screen px-4 sm:px-8 pb-24">
      {/* top bar */}
      <div className="max-w-6xl mx-auto pt-6 pb-2 flex items-center justify-between">
        <Link href="/" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
          ← DevScore Visualizer
        </Link>
        <span className="font-mono text-xs text-slate-500">@{username}</span>
      </div>

      <section className="max-w-6xl mx-auto mt-6">
        <SearchBar />
      </section>

      <Suspense fallback={<DashboardSkeleton />}>
        <div className="max-w-6xl mx-auto mt-14">
          <AnalysisSection username={username} />
        </div>
      </Suspense>
      <div className="max-w-6xl mx-auto mt-16">
        <CardGenerator username={username} />
      </div>
    </main>
  );
}
