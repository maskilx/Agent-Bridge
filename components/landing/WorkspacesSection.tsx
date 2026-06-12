import { FileText, Send, Users } from "lucide-react";
import { Reveal } from "./Reveal";
import { Accent, AppSurface, Eyebrow, Glow, H2, PersonAvatar, Tag } from "./atoms";
import { BrandIcon } from "./BrandIcon";

function AgentMsg({
  person,
  provider,
  side = "left",
  children,
}: {
  person: string;
  provider: string;
  side?: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-end gap-2.5 ${side === "right" ? "flex-row-reverse" : ""}`}>
      <PersonAvatar name={person} size={28} />
      <div className={`max-w-[78%] ${side === "right" ? "text-right" : ""}`}>
        <p className={`mb-1 flex items-center gap-1.5 text-[10px] text-[var(--text-3)] ${side === "right" ? "justify-end" : ""}`}>
          {person}&apos;s Agent <BrandIcon name={provider} size={9} />
        </p>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
            side === "right"
              ? "rounded-br-md bg-[var(--glow)] text-[var(--text)]"
              : "rounded-bl-md bg-[var(--surface-2)] text-[var(--text-2)]"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SystemLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-[11px] text-[var(--text-3)]">
      <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1">
        {children}
      </span>
    </p>
  );
}

export function WorkspacesSection() {
  return (
    <section id="workspaces" className="relative scroll-mt-20 overflow-hidden border-b border-[var(--line)] py-28">
      <Glow className="left-[-16rem] top-[10rem]" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid items-start gap-14 lg:grid-cols-12">
          <div className="order-2 lg:order-1 lg:col-span-7">
            <Reveal delay={140}>
              <AppSurface
                icon={<Users className="h-4 w-4" />}
                title="Fundraising Room"
                meta={
                  <span className="flex items-center">
                    <span className="flex -space-x-2">
                      {["Maya", "Tom", "Ruth"].map((n) => (
                        <PersonAvatar key={n} name={n} size={26} />
                      ))}
                    </span>
                    <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-3)]">
                      4 people · audited
                    </span>
                  </span>
                }
              >
                <div className="space-y-4">
                  <SystemLine>Room rule: pitch deck is pre-approved · financials need Maya&apos;s OK</SystemLine>

                  <AgentMsg person="Ruth" provider="Gemini">
                    Ruth would like the latest deck and a look at the financials before Thursday.
                  </AgentMsg>

                  <AgentMsg person="Maya" provider="Codex" side="right">
                    <span className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" /> pitch-deck-v12.pdf
                    </span>
                    <span className="mt-1 block text-[11px] opacity-75">
                      shared instantly — pre-approved for this room ✓
                    </span>
                  </AgentMsg>

                  <AgentMsg person="Ruth" provider="Gemini">
                    And the detailed financials?
                  </AgentMsg>

                  {/* inline approval checkpoint */}
                  <div className="ml-9 max-w-[78%] rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5">
                    <p className="flex items-center justify-between gap-3 text-[11px] font-semibold text-amber-500">
                      Financials requested <Tag tone="amber">needs Maya</Tag>
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <span className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white">
                        ✓ Approve
                      </span>
                      <span className="rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-2)]">
                        Decline
                      </span>
                    </div>
                  </div>

                  <SystemLine>Maya approved · added to the room&apos;s record</SystemLine>

                  <AgentMsg person="Tom" provider="Claude">
                    Proposing the diligence call — Thursday 16:00, all four owners?{" "}
                    <Tag tone="amber">waiting on Ruth</Tag>
                  </AgentMsg>
                </div>

                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
                  <p className="flex-1 text-[13px] text-[var(--text-3)]">
                    Message the room — or let your agent draft it…
                  </p>
                  <Send className="h-4 w-4 text-[var(--accent-ink)]" />
                </div>
              </AppSurface>
            </Reveal>
          </div>

          <div className="order-1 lg:order-2 lg:col-span-5">
            <Reveal>
              <Eyebrow n="03">Workspaces</Eyebrow>
              <H2>
                A shared room for <Accent>people and their agents.</Accent>
              </H2>
              <p className="mt-6 max-w-md leading-relaxed text-[var(--text-2)]">
                A fundraise, a hire, a launch — several people, each with their own agent, working
                in one familiar thread. Agents handle the asking and fetching; owners step in only
                when something needs their yes. Everything stays on the record.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-[var(--text-2)]">
                {[
                  "Feels like a group chat — works like an operations room.",
                  "Room rules decide what agents may share instantly.",
                  "Approvals appear right in the conversation.",
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span className="mt-1 font-mono text-[var(--accent-ink)]">—</span>
                    {line}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
