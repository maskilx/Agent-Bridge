import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { requestIntroAction } from "@/lib/actions";
import { getAgentForUser } from "@/lib/core";
import { listMatches } from "@/lib/matching";
import { listIntros } from "@/lib/intros";
import { Avatar, Card, EmptyState, PageHeader, ProviderBadge } from "@/components/ui";

export default async function MatchesPage() {
  const user = await requireUser();
  const myAgent = getAgentForUser(user.id);
  const matches = listMatches(user.id, myAgent);
  const intros = listIntros(user.id);
  const activeWith = new Set(
    intros
      .filter((i) => !["declined_by_initiator", "declined_by_target", "not_relevant"].includes(i.status))
      .flatMap((i) => [i.initiator_user_id, i.target_user_id])
  );
  const profileReady = Boolean(myAgent.looking_for.trim() || myAgent.goals.trim());

  return (
    <>
      <PageHeader
        title="Matches"
        subtitle="People whose agents look relevant to what you're looking for. Your agent reaches out, holds a limited exchange, and reports back — you approve before anything is shared."
      />

      {!profileReady && (
        <Card className="mb-6 border-amber-200 bg-amber-50/60 p-5">
          <p className="text-sm text-amber-800">
            Your agent doesn&apos;t know what to look for yet.{" "}
            <Link href="/agent" className="font-semibold underline">
              Define your goals and criteria
            </Link>{" "}
            to enable matching and outreach.
          </p>
        </Card>
      )}

      {matches.length === 0 ? (
        <EmptyState
          title="No other searchable agents yet"
          hint="Invite people to AgentBridge to grow the matching pool."
        />
      ) : (
        <div className="space-y-4">
          {matches.map((m) => {
            const inProgress = activeWith.has(m.user.id);
            return (
              <Card key={m.user.id} className="p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar name={m.user.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{m.user.name}</span>
                      <span className="text-xs text-slate-400">@{m.user.handle}</span>
                      <ProviderBadge provider={m.agent.provider} />
                      <span
                        className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          m.score >= 60
                            ? "bg-emerald-100 text-emerald-700"
                            : m.score >= 25
                              ? "bg-teal-50 text-teal-700"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        match {m.score}/100
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-600">{m.agent.description}</p>
                    {m.agent.looking_for && (
                      <p className="mt-1.5 text-xs text-slate-500">
                        <span className="font-semibold text-slate-400">They&apos;re looking for: </span>
                        {m.agent.looking_for}
                      </p>
                    )}
                    {(m.forward.length > 0 || m.reverse.length > 0) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[...new Set([...m.forward, ...m.reverse])].slice(0, 10).map((t) => (
                          <span
                            key={t}
                            className="rounded-md bg-teal-50 px-2 py-0.5 font-mono text-xs text-teal-700"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {inProgress ? (
                      <Link
                        href="/intros"
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
                      >
                        Intro in progress →
                      </Link>
                    ) : (
                      <form action={requestIntroAction}>
                        <input type="hidden" name="targetUserId" value={m.user.id} />
                        <button
                          type="submit"
                          disabled={!profileReady}
                          className="rounded-xl bg-teal-700 hover:bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
                        >
                          Have my agent reach out
                        </button>
                      </form>
                    )}
                    <span className="text-[11px] text-slate-400">No details shared until you approve</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
