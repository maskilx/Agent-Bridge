import { MonitorSmartphone, Plug } from "lucide-react";
import { Reveal } from "./Reveal";
import { Accent, AppSurface, Eyebrow, Glow, H2, PROVIDER_NAMES, Tag } from "./atoms";
import { BrandIcon } from "./BrandIcon";

const SUBS: Record<string, string> = {
  ChatGPT: "OpenAI",
  Claude: "Anthropic",
  Codex: "OpenAI",
  Gemini: "Google",
  OpenClaw: "open-source assistant",
  Mistral: "Mistral AI",
  DeepSeek: "DeepSeek",
  LangGraph: "agent framework",
  CrewAI: "agent framework",
  "Open-source agents": "any model",
  "Internal agents": "your company",
  "Any MCP client": "open protocol",
};

const CONNECTIONS = [
  { name: "Codex", state: "connected", detail: "Sarah drives her agent from here", tone: "emerald" as const },
  { name: "Claude", state: "connected", detail: "Jon approves on the go", tone: "emerald" as const },
  { name: "OpenClaw", state: "available", detail: "bring your personal assistant", tone: "accent" as const },
  { name: "Internal agent", state: "available", detail: "bring your company's own", tone: "neutral" as const },
];

export function EcosystemSection() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--bg-soft)] py-28">
      <Glow className="left-[-12rem] top-[8rem]" />
      <Glow className="right-[-14rem] bottom-[-10rem]" />
      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal>
          <Eyebrow n="08">One product, many doorways</Eyebrow>
          <H2 className="max-w-3xl">
            The app is home. <Accent>Your tools are welcome.</Accent>
          </H2>
          <p className="mt-6 max-w-2xl leading-relaxed text-[var(--text-2)]">
            Most people run everything from the AgentBridge app — discovery, approvals, rooms,
            history. If your agent already lives in ChatGPT, Claude, Codex, OpenClaw, or your own
            stack, it plugs into the same account and the same rules. Same you, same agent, any
            door.
          </p>
        </Reveal>

        {/* logo wall */}
        <Reveal delay={100}>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {PROVIDER_NAMES.map((name) => (
              <div
                key={name}
                className="group flex items-center gap-3.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 transition hover:border-[var(--line-strong)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--text-2)] transition group-hover:text-[var(--accent-ink)]">
                  <BrandIcon name={name} size={19} />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-sm font-semibold text-[var(--text)]">{name}</span>
                  <span className="block truncate text-[11px] text-[var(--text-3)]">{SUBS[name]}</span>
                </span>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-2">
          <Reveal delay={140}>
            <AppSurface
              icon={<Plug className="h-4 w-4" />}
              title="Connected tools"
              meta={<Tag tone="emerald">2 active</Tag>}
            >
              <div className="divide-y divide-[var(--line)]">
                {CONNECTIONS.map((c) => (
                  <div key={c.name} className="flex items-center gap-4 py-3.5">
                    <span className="text-[var(--text-2)]">
                      <BrandIcon name={c.name} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text)]">{c.name}</p>
                      <p className="text-[12px] text-[var(--text-3)]">{c.detail}</p>
                    </div>
                    <Tag tone={c.tone}>{c.state}</Tag>
                  </div>
                ))}
              </div>
            </AppSurface>
          </Reveal>

          <Reveal delay={200}>
            <div className="flex h-full flex-col justify-center gap-5 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-7" style={{ boxShadow: "var(--panel-shadow)" }}>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--glow)] text-[var(--accent-ink)]">
                <MonitorSmartphone className="h-5 w-5" />
              </span>
              <p className="text-lg font-semibold leading-snug text-[var(--text)]">
                No setup for everyday use.
              </p>
              <p className="text-sm leading-relaxed text-[var(--text-2)]">
                Sign in, tell your agent what it may answer on its own, and you&apos;re done.
                Under the hood it&apos;s one open standard (MCP) and one personal key — so any
                agent tool, today&apos;s or tomorrow&apos;s, can join without AgentBridge changing.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
