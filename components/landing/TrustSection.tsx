import { Reveal } from "./Reveal";
import { ShieldCheck, History } from "lucide-react";
import { Accent, AppSurface, Eyebrow, Glow, H2, PersonAvatar, Tag } from "./atoms";

const AUDIT = [
  ["Created by Dana's agent", "document request · sender verified"],
  ["Matched by AgentBridge", "you allow diligence requests from investors"],
  ["Routed to your agent", "across providers, no tool-switching"],
  ["Held for approval", "the file never moves without you"],
  ["Approved by you", "shared a watermarked copy — you could edit or decline"],
  ["Delivered to Dana's agent", "with the terms you set"],
  ["Done, on the record", "the whole exchange, replayable"],
];

export function TrustSection() {
  return (
    <section id="trust" className="relative scroll-mt-20 overflow-hidden border-b border-[var(--line)] py-28">
      <Glow className="left-[-14rem] bottom-[-6rem]" />
      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal>
          <Eyebrow n="05">Trust</Eyebrow>
          <H2 className="max-w-3xl">
            Agents propose. People approve. <Accent>Everything is recorded.</Accent>
          </H2>
        </Reveal>

        <div className="mt-16 grid items-start gap-8 lg:grid-cols-2">
          <Reveal delay={100}>
            <AppSurface icon={<ShieldCheck className="h-4 w-4" />} title="Approvals" meta={<Tag tone="amber">1 waiting</Tag>}>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
                <div className="flex items-center gap-3">
                  <PersonAvatar name="Dana" size={34} />
                  <p className="flex-1 text-sm font-semibold text-[var(--text)]">
                    Dana&apos;s Agent · Horizon Ventures
                  </p>
                  <Tag tone="amber">needs your approval</Tag>
                </div>
                <p className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[15px] leading-relaxed text-[var(--text)]">
                  “Requesting your Q3 financial summary for partner review ahead of Thursday&apos;s
                  diligence call.”
                </p>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--line)] px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--glow)] text-[var(--accent-ink)] text-sm">
                  ⎙
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text)]">
                    financial-summary-q3.pdf
                  </p>
                  <p className="text-[11px] text-[var(--text-3)]">
                    will be shared as a watermarked copy · view-only
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2.5">
                <span className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
                  ✓ Approve &amp; send
                </span>
                <span className="rounded-lg border border-[var(--line-strong)] px-4 py-2 text-xs font-semibold text-[var(--text-2)]">
                  Edit
                </span>
                <span className="rounded-lg border border-rose-500/40 px-4 py-2 text-xs font-semibold text-rose-500">
                  Reject
                </span>
              </div>
              <p className="mt-4 border-t border-[var(--line)] pt-3 text-xs text-[var(--text-3)]">
                Documents, code access, commitments — nothing your agent holds leaves without you.
              </p>
            </AppSurface>
          </Reveal>

          <Reveal delay={200}>
            <AppSurface icon={<History className="h-4 w-4" />} title="Activity" meta={<Tag tone="emerald">complete</Tag>}>
              <ol className="relative space-y-0 before:absolute before:bottom-4 before:left-[13px] before:top-4 before:w-px before:bg-[var(--line-strong)]">
                {AUDIT.map(([label, sub], i) => (
                  <li key={label} className="relative flex gap-4 py-2.5">
                    <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)] font-mono text-[10px] text-[var(--accent-ink)]">
                      {i + 1}
                    </span>
                    <div className="pt-0.5">
                      <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
                      <p className="mt-0.5 text-[12px] text-[var(--text-3)]">{sub}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </AppSurface>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
