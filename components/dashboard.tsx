"use client";

import { motion } from "framer-motion";
import {
  GitCommitHorizontal,
  Star,
  GitPullRequestArrow,
  CircleDot,
  Flame,
  AlertTriangle,
  GitFork,
  Users,
  Package,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import {
  formatNumber,
  timeAgo,
  cn,
} from "@/lib/utils";
import type { AnalysisPayload } from "@/types/github";
import { ActivityChart, LanguageDonut, HourHistogram } from "./charts";

/* ------------------------------- stat cards ------------------------------- */

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: "easeOut" as const },
});

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  delay,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      {...fade(delay)}
      className="glass rounded-2xl p-5 hover:border-white/15 transition-all"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-[0.08em] text-slate-400">
          {label}
        </span>
        <Icon size={18} className={accent} />
      </div>
      <div
        className={cn(
          "mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight text-white"
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </motion.div>
  );
}

/* ------------------------------ score panel ------------------------------- */

function ScoreRing({ score }: { score: number }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
      <motion.circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="url(#scoreGrad)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${c}`}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - filled }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        transform="rotate(-90 70 70)"
      />
      <defs>
        <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <text
        x="70"
        y="66"
        textAnchor="middle"
        className="fill-white"
        style={{ fontSize: 34, fontWeight: 700 }}
      >
        {score}
      </text>
      <text x="70" y="88" textAnchor="middle" className="fill-slate-500" style={{ fontSize: 11 }}>
        / 100
      </text>
    </svg>
  );
}

function ScorePanel({ payload }: { payload: AnalysisPayload }) {
  const { devScore } = payload;
  return (
    <motion.div
      {...fade(0.15)}
      className="glass rounded-2xl p-6 lg:col-span-2"
    >
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <ScoreRing score={devScore.score} />
          <div className="absolute inset-0 -z-10 rounded-full blur-2xl bg-cyan-400/10" />
        </div>
        <div className="flex-1 w-full">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">DevScore</h3>
            <span
              className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs font-bold tabular-nums backdrop-blur-md"
              style={{
                background: `${devScore.persona.color}22`,
                color: devScore.persona.color,
              }}
            >
              Grade {devScore.grade}
            </span>
          </div>
          <div className="mt-4 space-y-2.5">
            {devScore.details.pillars.map((p) => {
              const pct = (p.earned / p.max) * 100;
              return (
                <div key={p.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">
                      {p.label} <span className="text-slate-600">· {p.detail}</span>
                    </span>
                    <span className="font-mono text-slate-300">
                      {p.earned}/{p.max}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-linear-to-r from-neon-cyan to-neon-purple"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* persona */}
      <motion.div
        {...fade(0.5)}
        className="mt-6 flex items-center gap-4 rounded-xl p-4 border"
        style={{
          borderColor: `${devScore.persona.color}44`,
          background: `${devScore.persona.color}0d`,
        }}
      >
        <span className="text-3xl">{devScore.persona.emoji}</span>
        <div>
          <div className="text-sm font-semibold" style={{ color: devScore.persona.color }}>
            Dev Persona: {devScore.persona.title}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {devScore.persona.description}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------ heatmap ----------------------------------- */

function HeatmapSummary({ payload }: { payload: AnalysisPayload }) {
  const days = payload.contributions;
  const weeks: Array<typeof days> = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  const levelColors = [
    "bg-white/5",
    "bg-cyan-900/70",
    "bg-cyan-700/80",
    "bg-cyan-500",
    "bg-emerald-400",
  ];
  const total = days.reduce((s, d) => s + d.count, 0);
  const busiest = days.reduce(
    (best, d) => (d.count > best.count ? d : best),
    days[0] ?? { date: "", count: 0 }
  );

  return (
    <motion.div {...fade(0.3)} className="glass rounded-2xl p-6 lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Flame size={16} className="text-amber-400" />
          Contribution Streaks
        </h3>
        <div className="text-xs text-slate-400">
          {formatNumber(total)} contributions · 90d
        </div>
      </div>

      <div className="flex gap-4">
        <div className="space-y-6 shrink-0">
          <div>
            <div className="font-mono text-2xl font-bold tabular-nums text-amber-300">
              {payload.totals.currentStreak}
            </div>
            <div className="text-[10px] tracking-[0.08em] text-slate-500">
              Current streak
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold tabular-nums text-orange-400">
              {payload.totals.longestStreak}
            </div>
            <div className="text-[10px] tracking-[0.08em] text-slate-500">
              Record streak
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="flex gap-[3px] min-w-0">
            {weeks.slice(-18).map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count} contributions`}
                    className={cn(
                      "w-[9px] h-[9px] rounded-[2px]",
                      levelColors[day.level]
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
          {busiest.count > 0 && (
            <div className="mt-3 text-xs text-slate-500">
              Busiest day: {busiest.count} contributions ({timeAgo(busiest.date)})
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------ top repos --------------------------------- */

function TopRepos({ payload }: { payload: AnalysisPayload }) {
  return (
    <motion.div {...fade(0.35)} className="glass rounded-2xl p-6 lg:col-span-1">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
        <Star size={16} className="text-yellow-400" />
        Top Repositories
      </h3>
      <div className="space-y-3">
        {payload.topRepos.length === 0 && (
          <p className="text-sm text-slate-500">No public repositories found.</p>
        )}
        {payload.topRepos.map((repo) => (
          <a
            key={repo.id}
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-200 truncate">
                {repo.name}
              </span>
              <span className="shrink-0 flex items-center gap-1 text-xs text-yellow-300 font-mono tabular-nums">
                <Star size={12} className="text-yellow-400" />
                {formatNumber(repo.stargazers_count)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 line-clamp-1">
              {repo.description ?? "No description"}
            </p>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
              {repo.language && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  {repo.language}
                </span>
              )}
              <span className="flex items-center gap-1">
                <GitFork size={11} />
                {formatNumber(repo.forks_count)}
              </span>
              <span>pushed {timeAgo(repo.pushed_at)}</span>
            </div>
          </a>
        ))}
      </div>
    </motion.div>
  );
}

/* --------------------------------- main ----------------------------------- */

export function Dashboard({ payload }: { payload: AnalysisPayload }) {
  const { totals, meta, user } = payload;

  return (
    <div>
      {/* mock banner */}
      {meta.isMock && (
        <motion.div
          {...fade(0)}
          className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <div>
            <div className="font-semibold">GitHub rate limit hit</div>
            <div className="text-amber-200/80 text-xs mt-0.5">
              Showing sample data. The GitHub API allows 60 unauthenticated calls/hour
              per IP — add a <code>GITHUB_TOKEN</code> env var for 5,000/hour live data.
            </div>
          </div>
        </motion.div>
      )}

      {/* profile header */}
      <motion.div {...fade(0)} className="glass rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.avatar_url}
            alt={user.login}
            width={72}
            height={72}
            className="rounded-2xl border border-white/10"
          />
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white truncate">
              {user.name ?? user.login}
            </h2>
            <a
              href={user.html_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-cyan-400 hover:underline"
            >
              @{user.login}
            </a>
            {user.bio && (
              <p className="mt-1 text-sm text-slate-400 line-clamp-2">{user.bio}</p>
            )}
            <div className="mt-1.5 flex gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Users size={13} className="text-slate-500" />
                <span className="font-mono tabular-nums">{formatNumber(user.followers)}</span> followers
              </span>
              <span className="flex items-center gap-1.5">
                <Package size={13} className="text-slate-500" />
                <span className="font-mono tabular-nums">{user.public_repos}</span> public repos
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-500" />
                joined {timeAgo(user.created_at)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={GitCommitHorizontal}
          label="Total Commits"
          value={formatNumber(totals.commits)}
          sub="last 90d activity + push signal"
          accent="text-cyan-400"
          delay={0.05}
        />
        <StatCard
          icon={Star}
          label="Stars Earned"
          value={formatNumber(totals.stars)}
          sub={`${formatNumber(totals.forksTotal)} forks too`}
          accent="text-yellow-400"
          delay={0.12}
        />
        <StatCard
          icon={GitPullRequestArrow}
          label="PRs Merged"
          value={formatNumber(totals.prsMerged)}
          sub={`${formatNumber(totals.prsOpened)} shown recently`}
          accent="text-emerald-400"
          delay={0.19}
        />
        <StatCard
          icon={CircleDot}
          label="Issues Opened"
          value={formatNumber(totals.issuesOpened)}
          sub="lifetime public issues"
          accent="text-violet-400"
          delay={0.26}
        />
      </div>

      {/* score + langs */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ScorePanel payload={payload} />
        <LanguageDonut languages={payload.languages} />
      </div>

      {/* charts */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityChart contributions={payload.contributions} />
        <HourHistogram hours={payload.commitHours} />
      </div>

      {/* heatmap + repos */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HeatmapSummary payload={payload} />
        <TopRepos payload={payload} />
      </div>
    </div>
  );
}
