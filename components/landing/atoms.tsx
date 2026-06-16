import type { ReactNode } from "react";
import { BrandIcon } from "./BrandIcon";

/** Numbered mono eyebrow — the landing's section voice. */
export function Eyebrow({ n, children }: { n?: string; children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[12px] font-medium uppercase tracking-[0.26em] text-[var(--accent-ink)]">
      {n && <span className="text-[var(--text-3)]">{n}</span>}
      {n && <span className="h-px w-8 bg-[var(--line-strong)]" />}
      {children}
    </p>
  );
}

export function H2({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`mt-6 text-balance text-[42px] font-semibold leading-[1.08] tracking-[-0.025em] text-[var(--text)] sm:text-[52px] ${className}`}
    >
      {children}
    </h2>
  );
}

export function Accent({ children }: { children: ReactNode }) {
  return <span className="text-[var(--accent-ink)]">{children}</span>;
}

/** Soft atmospheric light — keeps the page alive section by section. */
export function Glow({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute h-[30rem] w-[44rem] rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)] ${className}`}
    />
  );
}

/** Console-style framed panel for product mockups. */
export function Panel({
  title,
  children,
  className = "",
  pad = true,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] ${className}`}
      style={{ boxShadow: "var(--panel-shadow)" }}
    >
      <div className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--surface-2)] px-5 py-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2.5 w-2.5 rounded-full bg-[var(--line-strong)] opacity-60" />
        ))}
        <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)]">
          {title}
        </span>
      </div>
      <div className={pad ? "p-6" : ""}>{children}</div>
    </div>
  );
}

export function Tag({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "amber" | "emerald" | "accent";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "text-[var(--text-2)] border-[var(--line)] bg-[var(--surface-2)]",
    amber: "text-amber-500 border-amber-500/30 bg-amber-500/10",
    emerald: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
    accent: "text-[var(--accent-ink)] border-[var(--accent-deep)]/40 bg-[var(--glow)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Demo personas render as initials badges (PersonAvatar falls back below).
 *  Map a name → an image path here only if it's a clearly-licensed/own asset. */
export const AVATARS: Record<string, string> = {};

/** Person avatar — photo when we have one, initials otherwise. */
export function PersonAvatar({
  name,
  size = 38,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const src = AVATARS[name.split(/\s+/)[0]?.toLowerCase() ?? ""];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`shrink-0 rounded-full object-cover ring-2 ring-[var(--surface)] ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 font-semibold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

/**
 * App-grade surface: cleaner chrome than the console Panel — an in-product screen,
 * not a terminal window.
 */
export function AppSurface({
  icon,
  title,
  meta,
  children,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] ${className}`}
      style={{ boxShadow: "var(--panel-shadow)" }}
    >
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-6 py-4">
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--glow)] text-[var(--accent-ink)]">
            {icon}
          </span>
        )}
        <span className="text-sm font-semibold text-[var(--text)]">{title}</span>
        {meta && <span className="ml-auto">{meta}</span>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/** A person + their agent: the core unit of the AgentBridge story. */
export function PersonAgentCard({
  name,
  agent,
  provider,
  status = "online",
}: {
  name: string;
  agent: string;
  provider: string;
  status?: string;
}) {
  return (
    <div
      className="w-56 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
      style={{ boxShadow: "var(--panel-shadow)" }}
    >
      <div className="flex items-center gap-3">
        <PersonAvatar name={name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text)]">{name}</p>
          <p className="flex items-center gap-1.5 text-xs text-[var(--text-3)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 blink-dot" />
            {status}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-2">
        <span className="text-[var(--text-2)]">
          <BrandIcon name={provider} size={14} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-[var(--text)]">{agent}</span>
          <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-3)]">
            via {provider}
          </span>
        </span>
      </div>
    </div>
  );
}

export const PROVIDER_NAMES = [
  "ChatGPT",
  "Claude",
  "Codex",
  "Gemini",
  "OpenClaw",
  "Mistral",
  "DeepSeek",
  "LangGraph",
  "CrewAI",
  "Open-source agents",
  "Internal agents",
  "Any MCP client",
];

/** Branded monochrome provider chip. */
export function ProviderChip({ name, sub }: { name: string; sub?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-[var(--text-2)] transition hover:border-[var(--line-strong)] hover:text-[var(--text)]">
      <BrandIcon name={name} size={16} />
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-[var(--text)]">{name}</span>
        {sub && (
          <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-3)]">
            {sub}
          </span>
        )}
      </span>
    </span>
  );
}
