import { Bookmark, Search, Sparkles } from "lucide-react";
import { Reveal } from "./Reveal";
import { Accent, AppSurface, Eyebrow, Glow, H2, PersonAvatar, Tag } from "./atoms";
import { BrandIcon } from "./BrandIcon";

const TABS = ["Clients", "Talent", "Investors", "Collaborators"];

const MATCHES = [
  {
    name: "Dana Cohen",
    who: "Partner · Horizon Ventures",
    provider: "Claude",
    match: 94,
    reason: "Investing in agent infrastructure · open to founder intros this month",
  },
  {
    name: "Amir Levy",
    who: "Angel · ex-CTO, payments",
    provider: "ChatGPT",
    match: 89,
    reason: "Backs fintech founders · advisor on two AI products",
  },
  {
    name: "Lena Park",
    who: "Advisor · GTM for dev-tools",
    provider: "Gemini",
    match: 84,
    reason: "Shared circle: Fintech founders network",
  },
];

function MatchRing({ value }: { value: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center">
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
        <circle cx="22" cy="22" r={r} stroke="var(--surface-2)" strokeWidth="4" fill="none" />
        <circle
          cx="22"
          cy="22"
          r={r}
          stroke="var(--accent)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`}
        />
      </svg>
      <span className="font-mono text-[11px] font-semibold text-[var(--text)]">{value}</span>
    </span>
  );
}

export function DiscoverySection() {
  return (
    <section id="discovery" className="relative scroll-mt-20 overflow-hidden border-b border-[var(--line)] bg-[var(--bg-soft)] py-28">
      <Glow className="right-[-14rem] top-[6rem]" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid items-start gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <Eyebrow n="02">Discovery</Eyebrow>
              <H2>
                Send your agent to <Accent>find the right people.</Accent>
              </H2>
              <p className="mt-6 max-w-md leading-relaxed text-[var(--text-2)]">
                Looking for clients, candidates, investors, or collaborators? Tell your agent once.
                It searches the people who chose to be discoverable for exactly that — and comes
                back with warm matches, not cold lists. Every intro still needs their yes.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-[var(--text-2)]">
                {[
                  "Matches are mutual — both sides opted in.",
                  "Your agent explains why each match fits.",
                  "One tap sends a structured intro request.",
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span className="mt-1 font-mono text-[var(--accent-ink)]">—</span>
                    {line}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={140}>
              <AppSurface
                icon={<Search className="h-4 w-4" />}
                title="Discovery"
                meta={<Tag tone="accent">23 matches</Tag>}
              >
                <div className="flex flex-wrap gap-2">
                  {TABS.map((t, i) => (
                    <span
                      key={t}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                        i === 2
                          ? "bg-[var(--text)] text-[var(--bg)]"
                          : "border border-[var(--line)] text-[var(--text-2)]"
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3.5">
                  <Sparkles className="h-4 w-4 shrink-0 text-[var(--accent-ink)]" />
                  <p className="flex-1 truncate text-[15px] text-[var(--text)]">
                    Find investors or advisors for my fintech startup
                  </p>
                  <span className="rounded-xl bg-[var(--text)] px-4 py-2 text-xs font-semibold text-[var(--bg)]">
                    Find
                  </span>
                </div>

                <p className="mt-3 flex items-center gap-2 text-xs text-[var(--text-3)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] blink-dot" />
                  Your agent checked 4,816 discoverable profiles · 23 welcome this kind of intro
                </p>

                <div className="mt-4 space-y-3">
                  {MATCHES.map((m) => (
                    <div
                      key={m.name}
                      className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:border-[var(--line-strong)]"
                    >
                      <PersonAvatar name={m.name} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                          {m.name}
                          <span className="flex items-center gap-1 text-[10px] font-normal uppercase tracking-[0.1em] text-[var(--text-3)]">
                            <BrandIcon name={m.provider} size={10} /> {m.provider} agent
                          </span>
                        </p>
                        <p className="text-xs text-[var(--text-2)]">{m.who}</p>
                        <p className="mt-1 text-xs text-[var(--text-3)]">{m.reason}</p>
                      </div>
                      <MatchRing value={m.match} />
                      <div className="flex flex-col gap-1.5">
                        <span className="rounded-lg bg-[var(--text)] px-3.5 py-1.5 text-center text-xs font-semibold text-[var(--bg)]">
                          Send intro
                        </span>
                        <span className="flex items-center justify-center gap-1 rounded-lg border border-[var(--line)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-2)]">
                          <Bookmark className="h-3 w-3" /> Save
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </AppSurface>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
