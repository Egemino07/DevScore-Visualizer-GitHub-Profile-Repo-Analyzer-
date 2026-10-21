"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import { motion } from "framer-motion";
import { Clock, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";

const SECTION_FADE = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

export function LanguageDonut({
  languages,
}: {
  languages: Array<{ name: string; percentage: number; color: string }>;
}) {
  if (languages.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 flex items-center justify-center text-sm text-slate-500">
        No language data in last 30 repos.
      </div>
    );
  }
  return (
    <motion.div {...SECTION_FADE} className="glass rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-white">Most Used Languages</h3>
      <div className="mt-4 flex items-center gap-4">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={languages}
                dataKey="percentage"
                nameKey="name"
                innerRadius={44}
                outerRadius={68}
                paddingAngle={2}
                stroke="none"
              >
                {languages.map((l) => (
                  <Cell key={l.name} fill={l.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
                contentStyle={{
                  background: "rgba(10,12,24,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "#e2e8f0",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1.5 min-w-0">
          {languages.map((l) => (
            <li key={l.name} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: l.color }}
              />
              <span className="text-slate-300 truncate">
                {l.name.length > 12 ? `${l.name.slice(0, 11)}…` : l.name}
              </span>
              <span className="ml-auto font-mono tabular-nums text-slate-400">
                {l.percentage.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export function ActivityChart({
  contributions,
}: {
  contributions: Array<{ date: string; count: number }>;
}) {
  const data = contributions.map((d) => ({
    day: d.date.slice(5),
    count: d.count,
  }));
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <motion.div {...SECTION_FADE} className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <TrendingUp size={16} className="text-cyan-400" />
          Activity — last 90 days
        </h3>
        <span className="text-xs text-slate-500">{formatNumber(total)} total</span>
      </div>
      <div className="mt-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(data.length / 7) || 1}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(10,12,24,0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "#e2e8f0",
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#actGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export function HourHistogram({
  hours,
}: {
  hours: number[]; // length-24 commit histogram
}) {
  const data = hours.map((count, hour) => ({
    hour: String(hour).padStart(2, "0"),
    count,
  }));

  return (
    <motion.div {...SECTION_FADE} className="glass rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <Clock size={16} className="text-violet-400" />
        Commit Clock
      </h3>
      <div className="mt-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <XAxis
              dataKey="hour"
              tick={{ fill: "#64748b", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={1}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "rgba(10,12,24,0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "#e2e8f0",
              }}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    i >= 20 || i < 5
                      ? "#a78bfa"
                      : i < 9
                      ? "#fbbf24"
                      : "#22d3ee"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 text-[10px] text-slate-500 mt-1">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-violet-400" /> night (20–4)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-400" /> early (5–8)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-cyan-400" /> day (9–19)</span>
      </div>
    </motion.div>
  );
}
