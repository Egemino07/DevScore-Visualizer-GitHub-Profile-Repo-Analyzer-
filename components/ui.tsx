import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------- Button --------------------------------- */

type ButtonVariant = "default" | "primary" | "ghost" | "outline" | "chip";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const buttonVariants: Record<ButtonVariant, string> = {
  default:
    "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20",
  primary:
    "bg-linear-to-r from-neon-cyan to-neon-purple text-slate-950 font-semibold hover:opacity-90 shadow-md shadow-cyan-500/15",
  ghost: "text-slate-300 hover:text-white hover:bg-white/5",
  outline:
    "border border-white/15 text-slate-200 hover:border-cyan-400/60 hover:text-cyan-300",
  chip: "bg-white/5 text-slate-300 border border-white/10 hover:border-cyan-400/50 hover:text-cyan-200 rounded-full text-xs",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-9 w-9",
};

export function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    />
  );
}

/* --------------------------------- Input --------------------------------- */

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-cyan-400/60 focus:bg-white/[0.06]",
        className
      )}
      {...props}
    />
  );
}

/* -------------------------------- Skeleton ------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/* --------------------------------- Switch -------------------------------- */

export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-white transition-colors"
    >
      <span
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors",
          checked
            ? "bg-cyan-500/80 border-cyan-400"
            : "bg-white/10 border-white/20"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[19px]" : "translate-x-0.5"
          )}
        />
      </span>
      {label}
    </button>
  );
}
