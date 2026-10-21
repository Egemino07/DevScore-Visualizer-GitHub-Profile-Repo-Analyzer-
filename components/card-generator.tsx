"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  FileCode2,
  Link2,
  Palette,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button, Switch } from "./ui";
import { buildCardSvg } from "@/lib/card-svg";
import { CARD_THEMES, THEME_ORDER } from "@/lib/card-themes";
import type { CardDesignState, CardThemeId } from "@/types/github";

interface Props {
  username: string;
}

const SHOW_KEYS: Array<{ key: keyof Pick<CardDesignState, "showDevScore" | "showLanguages" | "showPersona" | "showTopRepos">; label: string; param: string }> = [
  { key: "showDevScore", label: "DevScore", param: "score" },
  { key: "showLanguages", label: "Languages", param: "langs" },
  { key: "showPersona", label: "Persona badge", param: "persona" },
  { key: "showTopRepos", label: "Top repos", param: "repos" },
];

export function CardGenerator({ username }: Props) {
  const [state, setState] = useState<CardDesignState>({
    theme: "github-dark",
    username,
    showDevScore: true,
    showLanguages: true,
    showPersona: true,
    showTopRepos: true,
  });
  const [copied, setCopied] = useState<"md" | "svg-url" | null>(null);
  const [downloadingPng, setDownloadingPng] = useState(false);

  const markdownUrl = useMemo(() => {
    const show = SHOW_KEYS.filter((s) => state[s.key]).map((s) => s.param).join(",");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/api/card/${encodeURIComponent(username)}?theme=${state.theme}&show=${show || "none"}`;
  }, [state, username]);

  const ogUrl = useMemo(() => {
    const show = SHOW_KEYS.filter((s) => state[s.key]).map((s) => s.param).join(",");
    return `/api/og/${encodeURIComponent(username)}?theme=${state.theme}&show=${show || "none"}`;
  }, [state, username]);

  return (
    <section id="share-card">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
          <Palette size={20} className="text-violet-400" />
          Shareable Card Generator
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          Embed in your README or share on social media — customize the theme and
          visible metrics.
        </p>

        <div className="glass rounded-2xl p-6">
          {/* themes */}
          <div className="flex flex-wrap items-center gap-2">
            {THEME_ORDER.map((id) => {
              const t = CARD_THEMES[id];
              const active = state.theme === id;
              return (
                <button
                  key={id}
                  onClick={() => setState((s) => ({ ...s, theme: id as CardThemeId }))}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all ${
                    active
                      ? "border-cyan-400/70 text-white bg-cyan-400/10"
                      : "border-white/10 text-slate-400 hover:border-white/25"
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: t.accent }}
                  />
                  {t.name}
                  {active && <Check size={12} className="text-cyan-300" />}
                </button>
              );
            })}
          </div>

          {/* toggles */}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
            {SHOW_KEYS.map((s) => (
              <Switch
                key={s.key}
                checked={state[s.key]}
                onCheckedChange={(v) =>
                  setState((prev) => ({ ...prev, [s.key]: v }))
                }
                label={s.label}
              />
            ))}
          </div>

          {/* preview */}
          <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
            <CardPreviewFrame state={state} />
          </div>

          {/* actions */}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `![DevScore](${markdownUrl})`
                );
                setCopied("md");
                setTimeout(() => setCopied(null), 1600);
              }}
            >
              {copied === "md" ? (
                <Check size={15} className="text-emerald-400" />
              ) : (
                <Copy size={15} />
              )}
              Copy Markdown
            </Button>

            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(markdownUrl);
                setCopied("svg-url");
                setTimeout(() => setCopied(null), 1600);
              }}
            >
              {copied === "svg-url" ? (
                <Check size={15} className="text-emerald-400" />
              ) : (
                <Link2 size={15} />
              )}
              Copy SVG URL
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                window.open(`/api/card/${encodeURIComponent(username)}?theme=${state.theme}&show=${showString(state) || "none"}`, "_blank");
              }}
            >
              <FileCode2 size={15} />
              Open SVG
            </Button>

            <Button
              variant="primary"
              disabled={downloadingPng}
              onClick={async () => {
                setDownloadingPng(true);
                try {
                  const res = await fetch(ogUrl);
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `devscore-${username}.png`;
                  a.click();
                  URL.revokeObjectURL(url);
                } finally {
                  setDownloadingPng(false);
                }
              }}
            >
              <Download size={15} />
              {downloadingPng ? "Rendering…" : "Download PNG"}
            </Button>
          </div>

          {/* markdown snippet */}
          <div className="mt-5 rounded-xl bg-black/40 border border-white/5 p-3 font-mono text-xs text-emerald-300/80 overflow-x-auto">
            {`![DevScore](${markdownUrl})`}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Tip: use the markdown snippet in your profile README. The PNG button
            grabs the OG render from{" "}
            <code className="text-cyan-400">/api/og/{username}</code>.
          </p>
        </div>
      </motion.div>
    </section>
  );
}

function showString(state: CardDesignState) {
  return SHOW_KEYS.filter((s) => state[s.key]).map((s) => s.param).join(",");
}

/**
 * The preview shows the exact server-rendered SVG card via <img src>.
 * It re-renders instantly on design changes with no extra JS payload.
 */
function CardPreviewFrame({ state }: { state: CardDesignState }) {
  const src = `/api/card/${encodeURIComponent(state.username)}?theme=${state.theme}&show=${showString(state) || "none"}`;
  return (
    <Link href={src} target="_blank" rel="noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt="DevScore card preview"
        width={880}
        height={420}
        className="w-full h-auto"
        loading="lazy"
      />
    </Link>
  );
}
