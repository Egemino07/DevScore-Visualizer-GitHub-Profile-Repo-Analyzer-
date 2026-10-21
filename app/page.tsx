import Link from "next/link";
import {
  BarChart3,
  Trophy,
  Image as ImageIcon,
  Code2,
  Flame,
  Sparkles,
} from "lucide-react";
import { SearchBar } from "@/components/search-bar";

const FEATURES = [
  {
    icon: Trophy,
    title: "DevScore 0–100",
    desc: "Weighted score across commits, PRs, star power and streaks, with an S+/A/B grade.",
    accent: "text-cyan-400",
  },
  {
    icon: BarChart3,
    title: "Activity Dashboard",
    desc: "Stat cards, language donut, commit activity charts and contribution heatmap summary.",
    accent: "text-violet-400",
  },
  {
    icon: ImageIcon,
    title: "Shareable Cards",
    desc: "Themed SVG/PNG cards for your README with markdown copy-paste embeds.",
    accent: "text-emerald-400",
  },
  {
    icon: Sparkles,
    title: "Developer Personas",
    desc: "Night Owl, PR Machine, Bug Hunter — a playful badge derived from your data.",
    accent: "text-pink-400",
  },
] as const;

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center px-4">
      {/* hero */}
      <section className="w-full max-w-4xl flex flex-col items-center text-center pt-20 sm:pt-28 pb-10">
        <div className="mb-6 flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-1.5 text-xs text-cyan-300 animate-fade-in-up">
          <Flame size={14} />
          <span>GitHub Profile &amp; Repo Analyzer</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white animate-fade-in-up">
          What&apos;s your{" "}
          <span className="text-neon-cyan">DevScore</span>?
        </h1>

        <p className="mt-4 max-w-xl text-slate-400 text-sm sm:text-base animate-fade-in-up">
          Drop any GitHub username or repository link. Get a live activity
          dashboard, a 0–100 developer rating, and beautiful cards you can embed
          in your README or share on X and LinkedIn.
        </p>

        <div className="mt-10 w-full">
          <SearchBar />
        </div>
      </section>

      {/* features */}
      <section className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-14 pb-20">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="glass rounded-2xl p-5 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <f.icon className={f.accent} size={26} />
            <h3 className="mt-3 font-semibold text-slate-100">{f.title}</h3>
            <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* sample card preview */}
      <section className="w-full max-w-5xl pb-24">
        <h2 className="text-center text-lg text-slate-300 font-medium mb-6">
          Live cards, generated for any profile
        </h2>
        <div className="flex justify-center overflow-hidden rounded-2xl glass p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/card/torvalds?theme=nord"
            alt="Sample DevScore card for torvalds"
            width={880}
            height={420}
            className="rounded-xl"
          />
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          Rendered by <code className="text-cyan-400">/api/card/[username]</code> — try it with your own username.
        </p>
      </section>

      <footer className="pb-10 text-xs text-slate-600">
        Built with Next.js · Data from the GitHub REST &amp; GraphQL APIs ·{" "}
        <Link href="/analyze/shadcn" className="hover:text-cyan-400">
          Something like shadcn&apos;s score →
        </Link>
      </footer>
    </main>
  );
}
