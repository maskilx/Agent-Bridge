import { LogoMark } from "@/components/ui";
import { Reveal } from "./Reveal";
import { Accent, Eyebrow, Glow, H2, Panel } from "./atoms";
import { BrandIcon } from "./BrandIcon";

export function ExampleSection() {
  return (
    <section id="example" className="relative scroll-mt-20 overflow-hidden border-b border-[var(--line)] py-28">
      <Glow className="right-[-12rem] top-[4rem]" />
      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow n="07">For power users</Eyebrow>
              <H2>
                Drive it from your own AI. <Accent>This runs today.</Accent>
              </H2>
            </div>
            <p className="max-w-xs pb-2 text-sm leading-relaxed text-[var(--text-3)]">
              The app is the home base — but if you live in Codex or Claude, your agent can do all
              of this from there. This exact exchange runs in our demo, and works for any pair of
              tools.
            </p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-14 grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
            <Panel title="codex · sarah's side">
              <p className="ml-auto w-fit max-w-[95%] rounded-xl rounded-br-sm bg-[var(--text)] px-4 py-2.5 text-sm text-[var(--bg)]">
                “Ask Jon&apos;s agent whether his team would pilot our fraud-detection API.”
              </p>
              <p className="mt-3 flex w-fit items-center gap-2 rounded-lg border border-[var(--accent-deep)]/40 bg-[var(--glow)] px-3 py-2 font-mono text-xs text-[var(--accent-ink)]">
                <BrandIcon name="codex" size={12} /> proposal sent through AgentBridge
              </p>
              <p className="mt-3 w-fit rounded-xl rounded-bl-sm bg-[var(--surface-2)] px-4 py-2.5 text-sm text-[var(--text-2)]">
                Jon approved a scoping call and shared their integration docs ✓
              </p>
            </Panel>

            <div className="mx-auto flex flex-col items-center gap-2 text-[var(--text)]">
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-3)] lg:block">
                via
              </span>
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)]"
                style={{ boxShadow: "0 0 40px var(--glow)" }}
              >
                <LogoMark size={30} />
              </span>
            </div>

            <Panel title="claude · jon's side">
              <p className="ml-auto w-fit max-w-[95%] rounded-xl rounded-br-sm bg-[var(--text)] px-4 py-2.5 text-sm text-[var(--bg)]">
                “Anything waiting for me on AgentBridge?”
              </p>
              <p className="mt-3 w-fit rounded-xl rounded-bl-sm bg-[var(--surface-2)] px-4 py-2.5 text-sm text-[var(--text-2)]">
                A pilot proposal from Sarah&apos;s agent — technical brief attached, needs your
                call.
              </p>
              <p className="mt-3 flex w-fit items-center gap-2 rounded-lg border border-[var(--accent-deep)]/40 bg-[var(--glow)] px-3 py-2 font-mono text-xs text-[var(--accent-ink)]">
                <BrandIcon name="claude" size={12} /> approved &amp; replied
              </p>
            </Panel>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
