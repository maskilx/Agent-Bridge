import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar, formatTime } from "@/components/ui";

/** A WhatsApp-style message bubble. `me` → right/teal; otherwise left with avatar. */
export function Bubble({
  me,
  sender,
  agent,
  time,
  children,
}: {
  me?: boolean;
  sender?: string;
  agent?: boolean;
  time?: string;
  children: ReactNode;
}) {
  if (me) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-2xl rounded-br-md bg-teal-700 px-3.5 py-2 text-[14px] leading-relaxed text-white shadow-sm">
          {children}
          {time && <div className="mt-0.5 text-right text-[10px] text-teal-100/80">{formatTime(time)}</div>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2">
      <Avatar name={(sender ?? "•").replace(/'s Agent$/, "")} className="h-7 w-7 text-[11px]" />
      <div className="max-w-[78%]">
        {sender && (
          <p className={`mb-0.5 ml-1 text-[11px] font-semibold ${agent ? "text-teal-700" : "text-slate-500"}`}>
            {sender}
          </p>
        )}
        <div
          className={`rounded-2xl rounded-bl-md px-3.5 py-2 text-[14px] leading-relaxed shadow-sm ${
            agent ? "bg-teal-50/80 text-slate-700 ring-1 ring-teal-100" : "bg-white text-slate-700 ring-1 ring-slate-200/70"
          }`}
        >
          {children}
          {time && <div className="mt-0.5 text-[10px] text-slate-400">{formatTime(time)}</div>}
        </div>
      </div>
    </div>
  );
}

/** A centered system/status note in the thread. */
export function SystemNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center">
      <span className="max-w-[88%] rounded-full bg-slate-900/5 px-3 py-1 text-center text-[11.5px] leading-relaxed text-slate-500">
        {children}
      </span>
    </div>
  );
}

/** A pinned approval/decision card inside a conversation. */
export function PinnedCard({ tone = "amber", children }: { tone?: "amber" | "emerald" | "slate"; children: ReactNode }) {
  const cls =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50/70"
      : tone === "slate"
        ? "border-slate-200 bg-white/80"
        : "border-amber-200 bg-amber-50/70";
  return <div className={`mx-auto w-full max-w-[92%] rounded-2xl border ${cls} p-4 shadow-sm`}>{children}</div>;
}

/** Chat header shown above a thread. */
export function ChatHeader({
  title,
  subtitle,
  avatars,
  action,
}: {
  title: string;
  subtitle?: string;
  avatars: string[];
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur-sm">
      <Link href="/conversations" className="text-slate-400 transition hover:text-slate-700 md:hidden" aria-label="Back">
        ←
      </Link>
      <div className="flex -space-x-2">
        {avatars.slice(0, 3).map((n, i) => (
          <Avatar key={i} name={n} className="h-9 w-9 text-xs ring-2 ring-white" />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-slate-900">{title}</p>
        {subtitle && <p className="truncate text-[12px] text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
