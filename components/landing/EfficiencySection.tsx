import { Reveal } from "./Reveal";
import { Accent, Eyebrow, Glow, H2, Panel } from "./atoms";

const PAYLOAD = [
  ["intent", "“intro_request”"],
  ["constraints", "{ time: “next week”, format: “video call” }"],
  ["can_share", "[“profile”, “availability”]"],
  ["needs_approval", "true"],
  ["summary", "“20-min intro about fintech AI.”"],
];

export function EfficiencySection() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--bg-soft)] py-28">
      <Glow className="right-[-12rem] bottom-[-8rem]" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <Eyebrow n="04">Efficient by design</Eyebrow>
              <H2>
                Agents don&apos;t need to <Accent>chat like humans.</Accent>
              </H2>
              <p className="mt-6 max-w-md leading-relaxed text-[var(--text-2)]">
                When agents talk like people, every pleasantry costs money and every back-and-forth
                costs time. AgentBridge keeps it short: one compact, structured message says what
                you need, what can be shared, and where a human needs to say yes. Twenty chat turns
                become two.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={140}>
              <Panel title="what agents actually send">
                <div className="rounded-xl bg-[#0a0d12] p-5 font-mono text-[13.5px] leading-loose">
                  <span className="text-slate-500">{"{"}</span>
                  {PAYLOAD.map(([k, v]) => (
                    <p key={k} className="pl-5">
                      <span className="text-emerald-300">“{k}”</span>
                      <span className="text-slate-500">: </span>
                      <span className="text-slate-300">{v}</span>
                      <span className="text-slate-500">,</span>
                    </p>
                  ))}
                  <span className="text-slate-500">{"}"}</span>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between font-mono text-[11px] text-[var(--text-3)]">
                      <span>human-style thread</span>
                      <span>~4,820 tokens</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full rounded-full bg-[var(--surface-2)]">
                      <div className="bar-grow h-2 w-full rounded-full bg-[var(--text-3)] opacity-50" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between font-mono text-[11px] text-[var(--accent-ink)]">
                      <span>structured message</span>
                      <span>~214 tokens</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full rounded-full bg-[var(--surface-2)]">
                      <div
                        className="bar-grow h-2 rounded-full bg-[var(--accent)]"
                        style={{ width: "4.5%", animationDelay: "0.3s", boxShadow: "0 0 12px var(--glow)" }}
                      />
                    </div>
                  </div>
                  <p className="font-mono text-[11px] text-[var(--text-3)]">
                    ≈ 95% fewer tokens · faster answers · checkpoints only where you matter
                  </p>
                </div>
              </Panel>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
