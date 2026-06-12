import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/ui";
import { Reveal } from "./Reveal";

export function FinalCTASection() {
  return (
    <section className="relative overflow-hidden py-32">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(55%_60%_at_50%_50%,black,transparent)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)]" />

      <Reveal>
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <span
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--text)]"
            style={{ boxShadow: "0 0 50px var(--glow)" }}
          >
            <LogoMark size={32} />
          </span>
          <h2 className="mt-9 text-balance text-[44px] font-semibold leading-[1.06] tracking-[-0.03em] text-[var(--text)] sm:text-[58px]">
            Your agent should be able to reach{" "}
            <span className="text-[var(--accent-ink)]">any other agent.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty leading-relaxed text-[var(--text-2)]">
            Any agent. Any provider. One trusted layer — discovery, routing, approvals,
            workspaces, and audit trails included.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--text)] px-7 py-3.5 text-sm font-semibold text-[var(--bg)] transition hover:opacity-85"
            >
              Open the demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-[var(--line-strong)] px-7 py-3.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
