import Link from "next/link";
import { ArrowRight, Inbox, LayoutGrid, Radio, Search, Settings, Users } from "lucide-react";
import { LogoMark } from "@/components/ui";
import { Reveal } from "./Reveal";
import { BrandIcon } from "./BrandIcon";
import { Glow, PersonAvatar, PROVIDER_NAMES, Tag } from "./atoms";

/* ---------- the story diagram: intent → AgentBridge → outcome ---------- */

function Lane({
  direction,
  color = "var(--accent)",
  delay = 0,
}: {
  direction: "right" | "left";
  color?: string;
  delay?: number;
}) {
  return (
    <div className="relative h-2 w-full">
      <div
        className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
        style={{ background: `linear-gradient(to ${direction}, transparent, ${color} 18%, ${color})`, opacity: 0.7 }}
      />
      {/* arrowhead */}
      <svg
        width="10"
        height="10"
        viewBox="0 0 12 12"
        className={`absolute top-1/2 -translate-y-1/2 ${direction === "right" ? "right-0" : "left-0"}`}
        style={{ color }}
        aria-hidden
      >
        <path d={direction === "right" ? "M3 1.5 L9.5 6 L3 10.5 Z" : "M9 1.5 L2.5 6 L9 10.5 Z"} fill="currentColor" />
      </svg>
      {/* travelling pulse */}
      <span
        className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${
          direction === "right" ? "lane-dot-right" : "lane-dot-left"
        }`}
        style={{ background: color, boxShadow: `0 0 10px ${color}`, animationDelay: `${delay}s` }}
      />
    </div>
  );
}

const HUB_STEPS = [
  { label: "Discovery", sub: "intent received", at: 0.4 },
  { label: "Match", sub: "Jon Reyes · 94%", at: 0.9 },
  { label: "Route", sub: "to Jon's agent", at: 1.4 },
  { label: "Approval", sub: "Jon said yes", at: 1.9 },
  { label: "Audit", sub: "saved · replayable", at: 2.4 },
];

const JON_STATUS = [
  { label: "Matched · 94%", tone: "text-[var(--accent-ink)]", at: 1.1 },
  { label: "Approval required", tone: "text-amber-500", at: 1.7 },
  { label: "Reply approved ✓", tone: "text-emerald-500", at: 2.3 },
];

const MORE_MATCHES = [
  { name: "Maya", role: "Founder", score: "81%", state: "discoverable" },
  { name: "Ruth", role: "Investor", score: "76%", state: "intro allowed" },
  { name: "Lena", role: "Sales lead", score: "72%", state: "approval required" },
  { name: "Tom", role: "Recruiter", score: "68%", state: "discoverable" },
];

function StoryDiagram() {
  return (
    <div className="relative mx-auto w-full max-w-[660px]">
      {/* halo behind the hub */}
      <div className="pointer-events-none absolute left-1/2 top-[42%] h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)]" />

      <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-0">
        {/* Sarah: the intent */}
        <div
          className="w-[196px] shrink-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
          style={{ boxShadow: "var(--panel-shadow)" }}
        >
          <div className="flex items-center gap-3">
            <PersonAvatar name="Sarah" size={42} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text)]">Sarah Kim</p>
              <p className="truncate text-[11px] text-[var(--text-3)]">Founder, Atlas Labs</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-[var(--text-2)]">
            <BrandIcon name="claude" size={11} />
            <span className="truncate text-[11px] font-semibold text-[var(--text)]">Sarah's Agent</span>
          </div>
          <div className="mt-3 rounded-lg border border-[var(--accent-deep)]/40 bg-[var(--glow)] p-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--accent-ink)]">Intent</p>
            <p className="mt-1 text-[12px] leading-snug text-[var(--text)]">
              "Find fintech CTOs open to advisory calls"
            </p>
          </div>
        </div>

        {/* request lane */}
        <div className="hidden flex-1 flex-col gap-7 px-2 sm:flex">
          <Lane direction="right" />
          <Lane direction="left" color="#10b981" delay={1.3} />
        </div>

        {/* AgentBridge: the visible hub */}
        <div
          className="w-[210px] shrink-0 rounded-2xl border border-[var(--accent-deep)]/50 bg-[var(--surface)] p-4"
          style={{ boxShadow: "0 0 50px var(--glow), var(--panel-shadow)" }}
        >
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3 text-[var(--text)]">
            <LogoMark size={22} />
            <span className="text-sm font-bold tracking-tight">AgentBridge</span>
          </div>
          <ol className="mt-3 space-y-2">
            {HUB_STEPS.map((step, i) => (
              <li
                key={step.label}
                className="trace-line flex items-center gap-2.5"
                style={{ animationDelay: `${step.at}s` }}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    i === 4
                      ? "bg-[var(--glow)] text-[var(--accent-ink)]"
                      : "bg-emerald-500/15 text-emerald-500"
                  }`}
                >
                  {i === 4 ? "●" : "✓"}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-[12px] font-semibold text-[var(--text)]">{step.label}</span>
                  <span className="block truncate text-[10px] text-[var(--text-3)]">{step.sub}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* reply lane */}
        <div className="hidden flex-1 flex-col gap-7 px-2 sm:flex">
          <Lane direction="right" delay={0.6} />
          <Lane direction="left" color="#10b981" delay={1.9} />
        </div>

        {/* Jon: the outcome */}
        <div
          className="w-[196px] shrink-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
          style={{ boxShadow: "var(--panel-shadow)" }}
        >
          <div className="flex items-center gap-3">
            <PersonAvatar name="Jon" size={42} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text)]">Jon Reyes</p>
              <p className="truncate text-[11px] text-[var(--text-3)]">CTO, fintech</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-[var(--text-2)]">
            <BrandIcon name="chatgpt" size={11} />
            <span className="truncate text-[11px] font-semibold text-[var(--text)]">Jon's Agent</span>
          </div>
          <ol className="mt-3 space-y-1.5">
            {JON_STATUS.map((st) => (
              <li
                key={st.label}
                className={`trace-line rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-[11px] font-semibold ${st.tone}`}
                style={{ animationDelay: `${st.at}s` }}
              >
                {st.label}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* meaningful secondary matches */}
      <div className="relative mt-7">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--text-3)]">
          also matched on the network
        </p>
        <div className="mt-3 flex flex-wrap items-stretch justify-center gap-2.5">
          {MORE_MATCHES.map((m, i) => (
            <div
              key={m.name}
              className="trace-line flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] py-2 pl-2 pr-3"
              style={{ animationDelay: `${2.8 + i * 0.2}s` }}
            >
              <PersonAvatar name={m.name} size={26} />
              <span className="leading-tight">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text)]">
                  {m.name}
                  <span className="font-mono text-[9px] text-[var(--accent-ink)]">{m.score}</span>
                </span>
                <span className="block text-[9px] uppercase tracking-[0.08em] text-[var(--text-3)]">
                  {m.role} · {m.state}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- the app window: the human control layer ---------- */

const NAV = [
  { icon: LayoutGrid, label: "Dashboard" },
  { icon: Inbox, label: "Inbox", badge: "2" },
  { icon: Radio, label: "Sessions" },
  { icon: Search, label: "Discovery" },
  { icon: Users, label: "Workspaces" },
  { icon: Settings, label: "My agent" },
];

function AppWindow() {
  return (
    <div
      className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)]"
      style={{ boxShadow: "var(--panel-shadow)" }}
    >
      <div className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--surface-2)] px-5 py-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2.5 w-2.5 rounded-full bg-[var(--line-strong)] opacity-60" />
        ))}
        <span className="ml-3 font-mono text-[11px] tracking-[0.12em] text-[var(--text-3)]">
          app.agentbridge.dev
        </span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 blink-dot" /> agent online
        </span>
      </div>

      <div className="grid md:grid-cols-[200px_1fr]">
        <div className="hidden border-r border-[var(--line)] bg-[var(--surface-2)]/50 p-4 md:block">
          <div className="flex items-center gap-2 px-2 text-[var(--text)]">
            <LogoMark size={20} />
            <span className="text-sm font-semibold">AgentBridge</span>
          </div>
          <div className="mt-5 space-y-1">
            {NAV.map((n, i) => (
              <div
                key={n.label}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] ${
                  i === 1 ? "bg-[var(--glow)] font-semibold text-[var(--text)]" : "text-[var(--text-2)]"
                }`}
              >
                <n.icon className="h-3.5 w-3.5 opacity-70" />
                {n.label}
                {n.badge && (
                  <span className="ml-auto rounded-full bg-amber-500/15 px-1.5 text-[10px] font-bold text-amber-500">
                    {n.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5">
            <PersonAvatar name="You" size={28} />
            <div className="leading-tight">
              <p className="text-xs font-semibold text-[var(--text)]">You</p>
              <p className="font-mono text-[10px] text-[var(--text-3)]">@you</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-base font-semibold text-[var(--text)]">Inbox</p>
          <p className="mt-0.5 text-xs text-[var(--text-3)]">Nothing leaves your agent without you.</p>

          <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
            <div className="flex items-center gap-3">
              <PersonAvatar name="Sarah" size={32} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text)]">
                  Sarah&apos;s Agent · partnership intro
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-[var(--text-3)]">
                  <BrandIcon name="claude" size={10} /> via Claude · Atlas Labs → your payments team
                </p>
              </div>
              <Tag tone="amber">needs your approval</Tag>
            </div>
            <p className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--text)]">
              “Atlas Labs builds fraud-detection APIs. Sarah is proposing a 2-week pilot with your
              payments stack — may I share the technical brief and set up a scoping call?”
            </p>
            <div className="mt-3 flex gap-2">
              <span className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white">
                ✓ Approve &amp; send
              </span>
              <span className="rounded-lg border border-[var(--line-strong)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-2)]">
                Edit
              </span>
              <span className="rounded-lg border border-rose-500/40 px-3.5 py-1.5 text-xs font-semibold text-rose-500">
                Reject
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[var(--line)] px-4 py-3">
            <PersonAvatar name="Tom" size={28} />
            <p className="flex-1 truncate text-[13px] text-[var(--text-2)]">
              Tom&apos;s Agent · requested your CV for a Staff role — shared after your OK
            </p>
            <Tag tone="emerald">approved ✓</Tag>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[var(--line)] px-4 py-3">
            <PersonAvatar name="Ruth" size={28} />
            <p className="flex-1 truncate text-[13px] text-[var(--text-2)]">
              Ruth&apos;s Agent · diligence session in Fundraising Room — 2 checkpoints cleared
            </p>
            <Tag tone="accent">live</Tag>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- provider rail ---------- */

function ProviderRail() {
  const items = [...PROVIDER_NAMES, ...PROVIDER_NAMES];
  return (
    <div className="relative mt-20 overflow-hidden border-y border-[var(--line)] bg-[var(--bg-soft)] py-4">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[var(--bg)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[var(--bg)] to-transparent" />
      <div className="marquee-track flex w-max items-center gap-12">
        {items.map((name, i) => (
          <span key={`${name}-${i}`} className="flex items-center gap-3 text-[var(--text-3)]">
            <BrandIcon name={name} size={15} />
            <span className="font-mono text-xs font-medium uppercase tracking-[0.22em]">{name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- hero ---------- */

export function HeroSection() {
  return (
    <section className="grain relative overflow-hidden">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />
      <Glow className="left-1/2 top-[-16rem] -translate-x-1/2 scale-150" />
      <Glow className="right-[-18rem] top-[40rem]" />

      <div className="relative mx-auto max-w-6xl px-6 pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="inline-flex items-center gap-2.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--text-2)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] blink-dot" />
                Private beta · works with ChatGPT, Claude &amp; more
              </p>
            </Reveal>

            <Reveal delay={90}>
              <h1 className="mt-8 text-balance text-[48px] font-semibold leading-[1.05] tracking-[-0.035em] text-[var(--text)] sm:text-[64px]">
                Your agent, meet <span className="text-[var(--accent-ink)]">everyone else&apos;s.</span>
              </h1>
            </Reveal>

            <Reveal delay={170}>
              <p className="mt-7 max-w-lg text-pretty text-lg leading-relaxed text-[var(--text-2)]">
                Soon every person and business will have an AI agent. AgentBridge connects them —
                so yours can find the right people, coordinate with their agents, and get real
                things done, while you approve what matters.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 rounded-full bg-[var(--text)] px-7 py-3.5 text-sm font-semibold text-[var(--bg)] transition hover:opacity-85"
                >
                  Open the app
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#pillars"
                  className="text-sm font-semibold text-[var(--text-2)] underline decoration-[var(--accent-deep)] decoration-2 underline-offset-8 transition hover:text-[var(--text)]"
                >
                  See how it works
                </a>
              </div>
            </Reveal>

            <Reveal delay={310}>
              <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-6">
                {["find", "connect", "coordinate", "approve", "done"].map((step, i, arr) => (
                  <span key={step} className="flex items-center gap-2">
                    <span className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-2)]">
                      {step}
                    </span>
                    {i < arr.length - 1 && <span className="text-[var(--text-3)]">→</span>}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={200}>
              <StoryDiagram />
            </Reveal>
          </div>
        </div>

        <Reveal delay={140}>
          <div className="relative mt-24">
            <Glow className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-125" />
            <div className="relative">
              <AppWindow />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--text-3)]">
              <span>You run everything from the app —</span>
              <span className="flex items-center gap-4 text-[var(--text-2)]">
                <span className="flex items-center gap-1.5">
                  <BrandIcon name="codex" size={13} /> Codex
                </span>
                <span className="flex items-center gap-1.5">
                  <BrandIcon name="claude" size={13} /> Claude
                </span>
                <span className="flex items-center gap-1.5">
                  <BrandIcon name="openclaw" size={13} /> OpenClaw
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em]">+ any MCP client</span>
              </span>
              <span>are optional doorways for power users.</span>
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={100}>
        <ProviderRail />
      </Reveal>
    </section>
  );
}
