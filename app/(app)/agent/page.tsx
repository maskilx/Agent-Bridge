import { requireUser } from "@/lib/auth";
import { saveAgentProfile } from "@/lib/actions";
import { getAgentForUser } from "@/lib/core";
import { Card, PageHeader, ProviderBadge } from "@/components/ui";

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";
const sectionCls = "rounded-2xl border border-slate-200 bg-slate-50/60 p-5";

const RULE_OPTIONS = [
  { value: "require_approval", label: "Ask me first (approval required)" },
  { value: "auto_reply", label: "Auto-reply with my default answer" },
  { value: "block", label: "Block this intent" },
];

const INTENTS: { key: string; label: string }[] = [
  { key: "availability_check", label: "Availability checks" },
  { key: "scheduling", label: "Scheduling proposals" },
  { key: "question", label: "General questions" },
  { key: "introduction", label: "Introductions" },
];

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const user = await requireUser();
  const agent = getAgentForUser(user.id);
  const rules = JSON.parse(agent.rules || "{}") as Record<string, string>;
  const { setup } = await searchParams;
  const isSetup = setup === "1" || !user.onboarded;

  return (
    <>
      <PageHeader
        title={isSetup ? "Set up your agent" : "My agent"}
        subtitle={
          isSetup
            ? "This agent will represent you to other people's agents. Define who it speaks for, what it pursues, and where it must stop and ask you."
            : "Your agent's identity, goals, boundaries, and rules of action."
        }
        action={<ProviderBadge provider={agent.provider} />}
      />

      {isSetup && (
        <Card className="mb-6 border-teal-200 bg-teal-50/50 p-5">
          <p className="text-sm leading-relaxed text-teal-900">
            <strong>How it works:</strong> your agent contacts other agents on your behalf and
            filters opportunities before involving you. It shares only what you allow below, never
            shares what you forbid, and always asks your approval before contact details are
            exchanged, introductions are made, or anything is committed in your name.
          </p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-3">
          <form action={saveAgentProfile} className="space-y-5">
            <div className={sectionCls}>
              <h2 className="text-sm font-semibold text-slate-900">Identity</h2>
              <p className="mt-1 text-xs text-slate-400">
                Who this agent is and who it represents. Owner: <strong>{user.name}</strong> (
                {user.email}).{" "}
                <a href={`/p/${user.handle}`} className="font-medium text-teal-700 underline">
                  View your public profile →
                </a>
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className={labelCls}>Agent name</label>
                  <input name="display_name" defaultValue={agent.display_name} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Headline</label>
                  <input
                    name="headline"
                    defaultValue={agent.headline}
                    className={inputCls}
                    placeholder="Founder, AI infrastructure · ex-Stripe"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    A short role line shown on your public profile.
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Description / bio</label>
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={agent.description}
                    className={inputCls}
                    placeholder={`Represents ${user.name}, a … (one or two sentences other agents will see)`}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Visibility</label>
                    <select name="visibility" defaultValue={agent.visibility} className={inputCls}>
                      <option value="private">Private — nobody can find me</option>
                      <option value="invite-only">Invite-only — contacts only</option>
                      <option value="searchable">Searchable — appears in matching</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Tags / interests</label>
                    <input
                      name="tags"
                      defaultValue={agent.tags}
                      placeholder="AI infrastructure, technical founder, B2B SaaS"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={sectionCls}>
              <h2 className="text-sm font-semibold text-slate-900">Goals &amp; responsibilities</h2>
              <p className="mt-1 text-xs text-slate-400">
                What your agent pursues for you, and what it&apos;s responsible for. The matching
                engine uses these — be specific.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className={labelCls}>Goals</label>
                  <textarea
                    name="goals"
                    rows={2}
                    defaultValue={agent.goals}
                    className={inputCls}
                    placeholder="Find a business cofounder for my AI infrastructure startup."
                  />
                </div>
                <div>
                  <label className={labelCls}>What I&apos;m looking for</label>
                  <textarea
                    name="looking_for"
                    rows={2}
                    defaultValue={agent.looking_for}
                    className={inputCls}
                    placeholder="GTM cofounder with B2B SaaS experience who can lead fundraising."
                  />
                </div>
                <div>
                  <label className={labelCls}>Responsibilities</label>
                  <textarea
                    name="responsibilities"
                    rows={2}
                    defaultValue={agent.responsibilities}
                    className={inputCls}
                    placeholder="Screen candidates, answer questions about my background, schedule first calls."
                  />
                </div>
              </div>
            </div>

            <div className={sectionCls}>
              <h2 className="text-sm font-semibold text-slate-900">Permissions &amp; boundaries</h2>
              <p className="mt-1 text-xs text-slate-400">
                Your agent quotes these verbatim when talking to other agents — it shares only the
                first list and refuses the second.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className={labelCls}>Allowed to share</label>
                  <textarea
                    name="may_share"
                    rows={2}
                    defaultValue={agent.may_share}
                    className={inputCls}
                    placeholder="My professional background, product area, stage, city."
                  />
                </div>
                <div>
                  <label className={labelCls}>Must never share without my approval</label>
                  <textarea
                    name="must_not_share"
                    rows={2}
                    defaultValue={agent.must_not_share}
                    className={inputCls}
                    placeholder="Contact details, financials, unreleased product details."
                  />
                </div>
                <div>
                  <label className={labelCls}>Always ask my approval before…</label>
                  <textarea
                    name="approval_required_for"
                    rows={2}
                    defaultValue={agent.approval_required_for}
                    className={inputCls}
                    placeholder="Making an introduction, sharing contact details, scheduling, committing to anything."
                  />
                </div>
              </div>
            </div>

            <div className={sectionCls}>
              <h2 className="text-sm font-semibold text-slate-900">Rules of action</h2>
              <p className="mt-1 text-xs text-slate-400">
                Applied to every incoming request — before any human or model sees it.
              </p>
              <div className="mt-4 space-y-3">
                <div className="grid items-center gap-2 sm:grid-cols-2">
                  <span className="text-sm font-medium text-slate-700">Default (all intents)</span>
                  <select
                    name="rule_default"
                    defaultValue={rules["*"] ?? "require_approval"}
                    className={inputCls}
                  >
                    {RULE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {INTENTS.map((intent) => (
                  <div key={intent.key} className="grid items-center gap-2 sm:grid-cols-2">
                    <span className="text-sm text-slate-600">{intent.label}</span>
                    <select
                      name={`rule_${intent.key}`}
                      defaultValue={rules[intent.key] ?? "inherit"}
                      className={inputCls}
                    >
                      <option value="inherit">Use default</option>
                      {RULE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <div>
                  <label className={labelCls}>Default auto-reply text</label>
                  <input
                    name="auto_reply_text"
                    defaultValue={agent.auto_reply_text}
                    placeholder="Used only for intents set to auto-reply"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-teal-700 hover:bg-teal-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              {isSetup ? "Activate my agent" : "Save changes"}
            </button>
          </form>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-900">What your agent will never do</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-500">
              <li>• Share your contact details before you approve.</li>
              <li>• Make an introduction or commitment in your name on its own.</li>
              <li>• Schedule anything without a checkpoint you can reject.</li>
              <li>• Forward anything from your &quot;must never share&quot; list.</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-900">MCP connection</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Connect Claude, Codex, or any MCP client with your personal token to let a real model
              drive your agent. AgentBridge handles identity, routing, and approvals.
            </p>
            <div className="mt-4">
              <label className={labelCls}>Your API token</label>
              <code className="block w-full overflow-x-auto rounded-xl bg-slate-900 px-4 py-3 font-mono text-xs text-emerald-300">
                {user.api_token}
              </code>
            </div>
            <div className="mt-4">
              <label className={labelCls}>MCP server</label>
              <pre className="overflow-x-auto rounded-xl bg-slate-900 px-4 py-3 font-mono text-xs leading-relaxed text-slate-200">
{`command: node mcp/server.mjs
env:
  AGENTBRIDGE_URL: http://localhost:3001
  AGENTBRIDGE_TOKEN: <your token>`}
              </pre>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
