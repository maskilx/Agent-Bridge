"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui";
import type { ConversationItem } from "@/lib/conversations";

function timeShort(s: string): string {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const KIND_TAG: Record<ConversationItem["kind"], string> = {
  group: "Group",
  intro: "Intro",
  request: "Request",
};

export function ConversationList({ items, className = "" }: { items: ConversationItem[]; className?: string }) {
  const path = usePathname();
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? items.filter((i) => `${i.title} ${i.subtitle}`.toLowerCase().includes(q.trim().toLowerCase()))
    : items;

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="border-b border-slate-200/70 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[19px] font-medium tracking-tight text-slate-900">Chats</h1>
          <Link
            href="/groups"
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
          >
            ＋ New group
          </Link>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search conversations…"
          className="mt-2.5 w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">
            {items.length === 0 ? "No conversations yet." : `No matches for “${q}”.`}
          </p>
        ) : (
          filtered.map((c) => {
            const active = path === c.href;
            return (
              <Link
                key={`${c.kind}-${c.id}`}
                href={c.href}
                className={`flex items-center gap-3 border-b border-slate-100 px-4 py-3 transition ${
                  active ? "bg-teal-50/70" : "hover:bg-slate-50/70"
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar name={c.avatars[0] ?? c.title} className="h-10 w-10 text-sm" />
                  {c.pending && (
                    <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-amber-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14px] font-semibold text-slate-900">{c.title}</span>
                    <span className="shrink-0 text-[11px] text-slate-400">{timeShort(c.time)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-slate-100 px-1.5 py-px text-[9.5px] font-medium uppercase tracking-wide text-slate-400">
                      {KIND_TAG[c.kind]}
                    </span>
                    <span className={`truncate text-[12.5px] ${c.pending ? "font-medium text-amber-700" : "text-slate-500"}`}>
                      {c.subtitle}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
