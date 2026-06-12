import Link from "next/link";
import type { ReactNode } from "react";
import { BrandTile } from "./icons";

/** Bridge-relay mark: two endpoints joined by an arc, accent node at the apex. */
export function LogoMark({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <path
        d="M4 24 C 9.5 11, 22.5 11, 28 24"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="4" cy="24" r="2.7" fill="currentColor" />
      <circle cx="28" cy="24" r="2.7" fill="currentColor" />
      <circle cx="16" cy="14.2" r="4.6" fill="var(--accent, #0891b2)" />
      <circle cx="16" cy="14.2" r="1.7" fill="white" fillOpacity="0.92" />
    </svg>
  );
}

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const mark = size === "lg" ? 34 : size === "sm" ? 22 : 27;
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <span className="inline-flex items-center gap-2.5 text-current">
      <LogoMark size={mark} />
      <span className={`${text} font-semibold tracking-tight`}>AgentBridge</span>
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(29,27,23,0.04),0_12px_32px_-16px_rgba(29,27,23,0.10)] ${className}`}
    >
      {children}
    </div>
  );
}

const STATUS_STYLES: Record<string, { label: string; cls: string; dot: string }> = {
  pending: { label: "Pending", cls: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
  waiting_for_recipient: {
    label: "Waiting for approval",
    cls: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  edited: { label: "Edited reply", cls: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  rejected: { label: "Rejected", cls: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  completed: { label: "Completed", cls: "bg-teal-50 text-teal-800 ring-teal-200", dot: "bg-teal-500" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function ProviderBadge({ provider }: { provider: string }) {
  const isClaude = provider.toLowerCase().includes("claude") || provider.toLowerCase().includes("anthropic");
  const dot = isClaude ? "bg-orange-500" : "bg-teal-500";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {provider}
    </span>
  );
}

export function IntentBadge({ intent }: { intent: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 font-mono text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-200">
      {intent}
    </span>
  );
}

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-500 text-sm font-semibold text-white ${className}`}
    >
      {initials}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
      <div className="rise">
        <h1 className="font-display text-[27px] font-medium leading-snug tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="rise rise-1">{action}</div>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      <div className="aura" aria-hidden />
      <div className="relative mb-4">
        <span className="halo absolute -inset-2 rounded-2xl bg-teal-200/40 blur-xl" aria-hidden />
        <BrandTile size={46} radius={15} />
      </div>
      <p className="relative font-display text-[18px] font-medium text-slate-800">{title}</p>
      {hint && <p className="relative mt-1.5 max-w-sm text-sm leading-relaxed text-slate-400">{hint}</p>}
    </Card>
  );
}

export function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p className={`mt-1.5 font-display text-[26px] font-medium tracking-tight ${accent ?? "text-slate-900"}`}>
        {value}
      </p>
    </Card>
  );
}

export function RequestRow({
  href,
  title,
  counterparty,
  provider,
  intent,
  status,
  timestamp,
}: {
  href: string;
  title: string;
  counterparty: string;
  provider: string;
  intent: string;
  status: string;
  timestamp: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl px-4 py-3.5 transition hover:bg-slate-50"
    >
      <Avatar name={counterparty} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800 group-hover:text-teal-800">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <IntentBadge intent={intent} />
          <ProviderBadge provider={provider} />
          <span className="text-xs text-slate-400">{formatTime(timestamp)}</span>
        </div>
      </div>
      <StatusBadge status={status} />
    </Link>
  );
}

export function formatTime(sqliteUtc: string): string {
  // SQLite datetime('now') is UTC without a timezone marker.
  const date = new Date(sqliteUtc.replace(" ", "T") + "Z");
  if (isNaN(date.getTime())) return sqliteUtc;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
