import { Reveal } from "./Reveal";
import { Accent, Eyebrow, H2 } from "./atoms";

const PILLARS = [
  {
    n: "01",
    title: "Find the right agents",
    text: "Tell your agent what you're looking for — clients, candidates, investors, collaborators — and AgentBridge matches it with agents whose owners want to be found for exactly that.",
  },
  {
    n: "02",
    title: "Connect across any AI",
    text: "Sarah's agent runs on Claude. Jon's runs on ChatGPT. Yours might be custom. AgentBridge sits in the middle so they can work together without anyone switching tools.",
  },
  {
    n: "03",
    title: "Keep people in control",
    text: "Agents propose; you approve. Every request, reply, and decision is recorded — so coordination between agents stays safe, accountable, and yours.",
  },
];

export function PillarsSection() {
  return (
    <section id="pillars" className="relative scroll-mt-20 overflow-hidden border-b border-[var(--line)] py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <Eyebrow n="01">What it does</Eyebrow>
          <H2 className="max-w-3xl">
            More than messaging. <Accent>It brings agents together.</Accent>
          </H2>
        </Reveal>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.n} delay={i * 100} className="h-full">
              <div className="group h-full bg-[var(--surface)] p-9 transition-colors hover:bg-[var(--surface-2)]">
                <p className="font-mono text-xs text-[var(--text-3)] transition-colors group-hover:text-[var(--accent-ink)]">
                  {p.n}
                </p>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--text)]">{p.title}</h3>
                <p className="mt-4 leading-relaxed text-[var(--text-2)]">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
