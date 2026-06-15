"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { requestIntroAction } from "@/lib/actions";
import type { MatchLabel } from "@/lib/matching";

export type DiscoverItem = {
  userId: string;
  name: string;
  handle: string;
  picture: string;
  provider: string;
  description: string;
  lookingFor: string;
  tags: string[];
  reasons: string[];
  label: MatchLabel;
  inProgress: boolean;
};

const LABEL: Record<MatchLabel, { text: string; cls: string }> = {
  best: { text: "Best match", cls: "bg-emerald-100 text-emerald-700" },
  strong: { text: "Strong match", cls: "bg-teal-50 text-teal-700" },
  possible: { text: "Possible fit", cls: "bg-slate-100 text-slate-500" },
};

function MatchBadge({ label }: { label: MatchLabel }) {
  const m = LABEL[label];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>{m.text}</span>;
}

function PersonAvatar({ name, picture, size = 44 }: { name: string; picture: string; size?: number }) {
  if (picture) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={picture}
        alt={name}
        className="shrink-0 rounded-full object-cover ring-2 ring-white"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-500 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

function whyLine(it: DiscoverItem): string {
  if (it.reasons.length) return `Overlaps on ${it.reasons.slice(0, 3).join(", ")}.`;
  return "Open to relevant introductions.";
}

function ReachOut({ it, block = false }: { it: DiscoverItem; block?: boolean }) {
  if (it.inProgress) {
    return (
      <Link
        href="/intros"
        className={`rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800 ${block ? "block text-center" : ""}`}
      >
        Intro in progress →
      </Link>
    );
  }
  return (
    <form action={requestIntroAction} className={block ? "w-full" : ""} onClick={(e) => e.stopPropagation()}>
      <input type="hidden" name="targetUserId" value={it.userId} />
      <button
        type="submit"
        className={`rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-800 ${block ? "w-full py-2.5 text-sm" : ""}`}
      >
        Have my agent reach out
      </button>
    </form>
  );
}

export function Discover({ items }: { items: DiscoverItem[] }) {
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<DiscoverItem | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) =>
      `${it.name} ${it.handle} ${it.description} ${it.lookingFor} ${it.tags.join(" ")}`.toLowerCase().includes(s)
    );
  }, [q, items]);

  return (
    <>
      {/* search / filter — client-side over already-loaded people; never calls the model */}
      <div className="relative mb-5">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people by name, role, interest, or what they're looking for…"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">No people match “{q}”.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((it) => (
            <div
              key={it.userId}
              onClick={() => setPreview(it)}
              className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <div className="flex items-start gap-3.5">
                <PersonAvatar name={it.name} picture={it.picture} size={46} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{it.name}</span>
                    <span className="text-xs text-slate-400">@{it.handle}</span>
                    <span className="ml-auto">
                      <MatchBadge label={it.label} />
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-600">{it.description}</p>
                  <p className="mt-1.5 text-[12px] text-slate-400">{whyLine(it)}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 opacity-80 transition group-hover:opacity-100">
                  View profile →
                </span>
                <div onClick={(e) => e.stopPropagation()}>
                  <ReachOut it={it} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && <ProfilePanel it={preview} onClose={() => setPreview(null)} />}
    </>
  );
}

function ProfilePanel({ it, onClose }: { it: DiscoverItem; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="cc-fade absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <aside
        className="cc-panel-in relative flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative h-24 bg-[radial-gradient(120%_120%_at_30%_0%,rgba(13,148,136,0.16),transparent)]">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="-mt-10 flex-1 overflow-y-auto px-6 pb-6">
          <PersonAvatar name={it.name} picture={it.picture} size={80} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900">{it.name}</h2>
            <MatchBadge label={it.label} />
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-slate-400">@{it.handle} · via {it.provider}</p>

          <Section title="About">
            <p className="text-[13px] leading-relaxed text-slate-600">{it.description || "No description provided."}</p>
          </Section>

          {it.lookingFor && (
            <Section title="Open to / looking for">
              <p className="text-[13px] leading-relaxed text-slate-600">{it.lookingFor}</p>
            </Section>
          )}

          {it.tags.length > 0 && (
            <Section title="Interests">
              <div className="flex flex-wrap gap-1.5">
                {it.tags.map((t) => (
                  <span key={t} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
                    {t}
                  </span>
                ))}
              </div>
            </Section>
          )}

          <Section title="Why your agent flagged them">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
              <p className="text-[13px] leading-relaxed text-slate-700">{whyLine(it)}</p>
              {it.reasons.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {it.reasons.map((r) => (
                    <span key={r} className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[10px] text-emerald-700">
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </div>

        <div className="border-t border-slate-100 p-5">
          <ReachOut it={it} block />
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Your agent shares only what you&apos;ve allowed — and nothing is sent until you approve.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
