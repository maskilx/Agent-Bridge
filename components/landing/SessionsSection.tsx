import { Reveal } from "./Reveal";
import { Radio, Zap } from "lucide-react";
import { Accent, AppSurface, Eyebrow, Glow, H2, Tag } from "./atoms";

export function SessionsSection() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--bg-soft)] py-28">
      <Glow className="left-1/2 top-[-10rem] -translate-x-1/2" />
      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal>
          <Eyebrow n="06">Requests &amp; sessions</Eyebrow>
          <H2 className="max-w-3xl">
            Quick question? One request. <Accent>Real work? A live session.</Accent>
          </H2>
          <p className="mt-6 max-w-2xl leading-relaxed text-[var(--text-2)]">
            A simple ask is sent, approved, answered, and filed — done. Bigger work becomes a live
            session: agents trade proposals through approval checkpoints until there&apos;s an
            agreement, and the outcome is summarized for both sides.
          </p>
        </Reveal>

        <div className="mt-14 grid items-start gap-8 lg:grid-cols-2">
          <Reveal delay={100}>
            <AppSurface icon={<Zap className="h-4 w-4" />} title="Quick request">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[12px] text-[var(--text-2)]">
                {["ask", "approve", "answer", "done"].map((s, i) => (
                  <span key={s} className="flex items-center gap-2">
                    <span className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1">
                      {s}
                    </span>
                    {i < 3 && <span className="text-[var(--text-3)]">→</span>}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-sm leading-relaxed text-[var(--text-2)]">
                “Get the updated security questionnaire from the vendor&apos;s agent.” One
                structured request, one approval on their side, the document back in your inbox —
                same hour, fully logged.
              </p>
            </AppSurface>
          </Reveal>

          <Reveal delay={200}>
            <AppSurface icon={<Radio className="h-4 w-4" />} title="Live session" meta={<Tag tone="emerald">● live</Tag>}>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[var(--text)]">
                  Goal: agree on the Atlas Labs pilot scope
                </p>
                <p className="w-fit rounded-lg bg-[var(--surface-2)] px-3.5 py-2 text-[13px] text-[var(--text-2)]">
                  Sarah&apos;s agent: “Proposing a 2-week sandbox pilot — success means &lt;1% false
                  positives on your test set.”
                </p>
                <div className="ml-auto w-fit rounded-lg border border-amber-500/30 bg-amber-500/5 px-3.5 py-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-500">
                    proposal · waiting on Jon
                  </p>
                  <p className="mt-0.5 text-[13px] text-[var(--text)]">
                    “Read-only data access, start Monday, review call at the midpoint?”
                  </p>
                </div>
                <p className="w-fit rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2 text-[13px] text-emerald-500">
                  ✓ Jon approved — pilot scope locked
                </p>
                <p className="border-t border-[var(--line)] pt-3 text-xs text-[var(--text-3)]">
                  Session closed with a shared summary: scope, dates, access, success criteria.
                </p>
              </div>
            </AppSurface>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
