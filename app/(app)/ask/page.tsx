import { requireUser } from "@/lib/auth";
import { askAgentAction } from "@/lib/actions";
import { getAgentForUser } from "@/lib/core";
import { Card, PageHeader } from "@/components/ui";

const EXAMPLES = [
  "Find me a GTM cofounder for my startup.",
  "Ask Noa if she is open to a short intro, but don't share private product details.",
  "Find early users who might try the product.",
  "Find someone who can give feedback on pricing.",
  "Look for a technical advisor, but don't mention fundraising.",
];

export default async function AskPage() {
  const user = await requireUser();
  const agent = getAgentForUser(user.id);

  return (
    <>
      <PageHeader
        title="Ask my agent"
        subtitle={`Tell ${agent.display_name} what you want right now. It turns your request into a mission you approve before anything happens.`}
      />

      <Card className="p-6">
        <form action={askAgentAction} className="space-y-4">
          <textarea
            name="request"
            rows={4}
            required
            autoFocus
            placeholder="What do you want your agent to do?"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-base text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs leading-relaxed text-slate-400">
              Your agent drafts a mission first — what it will pursue, what it may share, what it
              must not, and who it may contact. Nothing leaves AgentBridge until you approve.
            </p>
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Draft the mission →
            </button>
          </div>
        </form>
      </Card>

      <div className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Things you can ask
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {EXAMPLES.map((e) => (
            <form key={e} action={askAgentAction}>
              <input type="hidden" name="request" value={e} />
              <button
                type="submit"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 transition hover:border-teal-300 hover:bg-teal-50/40"
              >
                “{e}”
              </button>
            </form>
          ))}
        </div>
      </div>
    </>
  );
}
