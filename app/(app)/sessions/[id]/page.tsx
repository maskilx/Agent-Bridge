import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  completeSessionAction,
  decideProposalAction,
  sendSessionMessageAction,
} from "@/lib/actions";
import { getSessionEvents, getSessionView, type SessionEvent } from "@/lib/sessions";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Card, PageHeader, ProviderBadge, formatTime } from "@/components/ui";

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";

function SystemEvent({ event }: { event: SessionEvent }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-slate-100" />
      <p className="max-w-[80%] text-center text-xs text-slate-400">
        {event.content} · {formatTime(event.created_at)}
      </p>
      <span className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

export default async function SessionDetailPage(ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await ctx.params;
  const session = getSessionView(id);
  if (!session || (session.created_by_user_id !== user.id && session.peer_user_id !== user.id)) {
    notFound();
  }
  const { events } = getSessionEvents(id, user.id);
  const isActive = session.status === "active";
  const otherName = session.created_by_user_id === user.id ? session.peer_name : session.created_by_name;

  return (
    <>
      {isActive && <AutoRefresh intervalMs={4000} />}
      <div className="mb-6">
        <Link href="/sessions" className="text-xs font-medium text-slate-400 hover:text-teal-700">
          ← All sessions
        </Link>
      </div>
      <PageHeader
        title={session.topic}
        subtitle={`Session ${session.id} · with ${otherName}`}
        action={
          isActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 blink-dot" />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-inset ring-teal-200">
              Completed
            </span>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-6">
            <div className="space-y-4">
              {events.map((e) => {
                if (e.type !== "message") return <SystemEvent key={e.id} event={e} />;
                const mine = e.actor_user_id === user.id;
                const isProposal = e.kind === "proposal";
                return (
                  <div key={e.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] ${mine ? "text-right" : "text-left"}`}>
                      <p className="mb-1 text-[11px] text-slate-400">
                        {e.actor_label} · {formatTime(e.created_at)}
                      </p>
                      {isProposal ? (
                        <div
                          className={`rounded-2xl border-l-4 p-4 text-left shadow-sm ring-1 ring-inset ${
                            e.approval_status === "pending"
                              ? "border-amber-400 bg-amber-50/60 ring-amber-100"
                              : e.approval_status === "approved"
                                ? "border-emerald-400 bg-emerald-50/50 ring-emerald-100"
                                : "border-rose-400 bg-rose-50/50 ring-rose-100"
                          }`}
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Approval checkpoint ·{" "}
                            <span
                              className={
                                e.approval_status === "pending"
                                  ? "text-amber-600"
                                  : e.approval_status === "approved"
                                    ? "text-emerald-600"
                                    : "text-rose-600"
                              }
                            >
                              {e.approval_status}
                            </span>
                            {e.decided_via && (
                              <span className="ml-1.5 normal-case text-slate-400">
                                via {e.decided_via}
                              </span>
                            )}
                          </p>
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-800">{e.content}</p>
                          {e.approval_status === "pending" && !mine && isActive && (
                            <div className="mt-3 flex gap-2">
                              <form action={decideProposalAction}>
                                <input type="hidden" name="sessionId" value={session.id} />
                                <input type="hidden" name="eventId" value={e.id} />
                                <button
                                  name="decision"
                                  value="approved"
                                  className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                                >
                                  Approve
                                </button>
                              </form>
                              <form action={decideProposalAction}>
                                <input type="hidden" name="sessionId" value={session.id} />
                                <input type="hidden" name="eventId" value={e.id} />
                                <button
                                  name="decision"
                                  value="rejected"
                                  className="rounded-lg border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                                >
                                  Reject
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p
                          className={`inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            mine
                              ? "rounded-br-md bg-slate-900 text-white"
                              : "rounded-bl-md bg-slate-100 text-slate-800"
                          }`}
                        >
                          {e.content}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {isActive && (
            <Card className="p-5">
              <form action={sendSessionMessageAction} className="space-y-3">
                <input type="hidden" name="sessionId" value={session.id} />
                <textarea
                  name="message"
                  rows={2}
                  required
                  placeholder="Write a message or a concrete proposal…"
                  className={inputCls}
                />
                <div className="flex flex-wrap gap-2.5">
                  <button
                    name="kind"
                    value="update"
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Send message
                  </button>
                  <button
                    name="kind"
                    value="proposal"
                    className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    Send as proposal
                  </button>
                </div>
              </form>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-900">Participants</h2>
            <div className="mt-4 space-y-4">
              {[
                { name: session.created_by_name, agent: session.created_by_agent, provider: session.created_by_provider, label: "Started by" },
                { name: session.peer_name, agent: session.peer_agent, provider: session.peer_provider, label: "With" },
              ].map((p) => (
                <div key={p.label}>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{p.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{p.agent}</p>
                  <p className="text-xs text-slate-400">{p.name}</p>
                  <div className="mt-1.5">
                    <ProviderBadge provider={p.provider} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {session.summary && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-slate-900">Outcome</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{session.summary}</p>
            </Card>
          )}

          {isActive && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-slate-900">Complete session</h2>
              <form action={completeSessionAction} className="mt-3 space-y-3">
                <input type="hidden" name="sessionId" value={session.id} />
                <input name="summary" placeholder="Outcome summary (optional)" className={inputCls} />
                <button className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300">
                  Mark completed
                </button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
