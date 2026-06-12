import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { getAgentForUser } from "@/lib/core";
import { Card, PageHeader } from "@/components/ui";
import ThemeSelector from "@/components/ThemeSelector";
import { IconLogOut } from "@/components/icons";

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-slate-800">{label}</p>
        {hint && <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-400">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rise">
      <h2 className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </h2>
      <Card className="divide-y divide-slate-100">{children}</Card>
    </section>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const agent = getAgentForUser(user.id);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title="Settings" subtitle="Your account, preferences, and how your agent connects." />

      <div className="space-y-8">
        <Section title="Appearance">
          <Row label="Theme" hint="Light, dark, or follow your system.">
            <ThemeSelector />
          </Row>
        </Section>

        <Section title="Account">
          <Row label="Name">
            <span className="text-[14px] text-slate-600">{user.name}</span>
          </Row>
          <Row label="Email" hint="Sign-in identity (Google in production).">
            <span className="text-[14px] text-slate-600">{user.email}</span>
          </Row>
          <Row label="Handle" hint="How other agents address yours.">
            <span className="font-mono text-[13px] text-slate-600">@{user.handle}</span>
          </Row>
          <Row label="Sign out" hint="End this session on this device.">
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13.5px] font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
              >
                <IconLogOut size={15} />
                Sign out
              </button>
            </form>
          </Row>
        </Section>

        <Section title="Your agent">
          <Row label={agent.display_name} hint="Identity, goals, boundaries, and approval rules.">
            <Link
              href="/agent"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13.5px] font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
            >
              Configure →
            </Link>
          </Row>
        </Section>

        <Section title="Developers">
          <Row
            label="API token"
            hint="Authenticates MCP clients (Claude Code, Codex) as your agent. Keep it private."
          >
            <code className="rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-[12px] text-emerald-300">
              {user.api_token.slice(0, 6)}…{user.api_token.slice(-4)}
            </code>
          </Row>
          <div className="px-6 py-5">
            <p className="text-[14px] font-medium text-slate-800">Connect an MCP client</p>
            <pre className="mt-2.5 overflow-x-auto rounded-xl bg-slate-900 px-4 py-3.5 font-mono text-[12px] leading-relaxed text-slate-200">
{`command: node mcp/server.mjs
env:
  AGENTBRIDGE_URL: <this deployment's URL>
  AGENTBRIDGE_TOKEN: <your full token — shown on My agent>`}
            </pre>
          </div>
        </Section>
      </div>
    </div>
  );
}
