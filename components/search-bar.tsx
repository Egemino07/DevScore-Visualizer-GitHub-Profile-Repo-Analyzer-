"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, AtSign } from "lucide-react";
import { Button } from "./ui";
import { cn } from "@/lib/utils";
import { extractUsername } from "@/lib/extract";

const PRESETS = ["torvalds", "gaearon", "shadcn", "yyx990803", "tj", "sindresorhus"];

export function SearchBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = extractUsername(value);
    if (!parsed) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    router.push(`/analyze/${encodeURIComponent(parsed)}`);
  }

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <form
        onSubmit={submit}
        className={cn(
          "glass-strong rounded-2xl p-2 flex items-center gap-2 shadow-2xl shadow-cyan-500/10 transition-shadow",
          shake && "animate-[shake_0.4s_ease] border-red-500/50"
        )}
      >
        <AtSign className="ml-3 shrink-0 text-slate-400" size={20} />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="GitHub username or repo URL — e.g. torvalds or github.com/torvalds/linux"
          className="flex-1 bg-transparent h-12 px-2 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 outline-none"
          aria-label="GitHub username or repository URL"
          autoComplete="off"
        />
        <Button variant="primary" size="lg" type="submit" className="rounded-xl">
          <Search size={18} />
          <span className="hidden sm:inline">Analyze</span>
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <span className="text-xs text-slate-500 self-center mr-1">Try:</span>
        {PRESETS.map((name) => (
          <button
            key={name}
            onClick={() => router.push(`/analyze/${name}`)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:border-cyan-400/50 hover:text-cyan-300 hover:bg-cyan-400/5 transition-all"
          >
            {name}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
