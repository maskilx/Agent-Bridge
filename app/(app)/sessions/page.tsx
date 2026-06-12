import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { startSessionAction } from "@/lib/actions";
import { listSessions } from "@/lib/sessions";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Avatar, Card, EmptyState, PageHeader, ProviderBadge, formatTime } from "@/components/ui";

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";

export default async function SessionsPage() {
  const user = await requireUser();
  const sessions = listSessions(user.id, false);
  const active = sessions.filter((s) => s.status === "active");
  const completed = sessions.filter((s) => s.status === "completed");

  return (
    <>
      <AutoRefresh intervalMs={5000} />
      <PageHeader
        title="Sessions"
        subtitle="Live coordination rooms between your agent and another — multi-turn, with approval checkpoints."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Active · {active.length}
            </h2>
            {active.length === 0 ? (
              <Card className="mt-3 px-6 py-10 text-center text-sm text-slate-400">
                No active sessions. Start one here or from your agent via{" "}
                <code className="font-mono text-xs">start_session</code>.
              </Card>
            ) : (
              <div className="mt-3 space-y-3">
                {active.map((s) => {
                  const otherName = s.created_by_user_id === user.id ? s.peer_name : s.created_by_name;
                  const otherProvider =
                    s.created_by_user_id === user.id ? s.peer_provider : s.created_by_provider;
                  return (
                    <Link key={s.id} href={`/sessions/${s.id}`} className="block">
                      <Card className="flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                        <Avatar name={otherName} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{s.topic}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            with {otherName} · updated {formatTime(s.updated_at)}
                          </p>
                        </div>
                        {s.pending_checkpoints > 0 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {s.pending_checkpoints} checkpoint{s.pending_checkpoints > 1 ? "s" : ""}
                          </span>
                        )}
                        <ProviderBadge provider={otherProvider} />
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {completed.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Completed
              </h2>
              <div className="mt-3 space-y-3">
                {completed.map((s) => {
                  const otherName = s.created_by_user_id === user.id ? s.peer_name : s.created_by_name;
                  return (
                    <Link key={s.id} href={`/sessions/${s.id}`} className="block">
                      <Card className="flex items-center gap-4 p-5 opacity-80 transition hover:opacity-100">
                        <Avatar name={otherName} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-700">{s.topic}</p>
                          {s.summary && (
                            <p className="mt-0.5 truncate text-xs text-slate-400">{s.summary}</p>
                          )}
                        </div>
                        <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-inset ring-teal-200">
                          Completed
                        </span>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {sessions.length === 0 && (
            <EmptyState
              title="No sessions yet"
              hint="Sessions are stateful rooms where two agents coordinate over multiple turns — with human approval checkpoints along the way."
            />
          )}
        </div>

        <Card className="h-fit p-6">
          <h2 className="text-sm font-semibold text-slate-900">Start a session</h2>
          <form action={startSessionAction} className="mt-4 space-y-3">
            <input name="with" required placeholder="With… e.g. @ethan" className={inputCls} />
            <input name="topic" required placeholder="Topic, e.g. Verify a capability claim for the sales deck" className={inputCls} />
            <textarea name="message" rows={2} placeholder="Opening message (optional)" className={inputCls} />
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Open session
            </button>
            <p className="text-xs leading-relaxed text-slate-400">
              Agents can also start and join sessions through MCP:{" "}
              <code className="font-mono text-[11px]">start_session</code>,{" "}
              <code className="font-mono text-[11px]">send_session_message</code>,{" "}
              <code className="font-mono text-[11px]">get_session_events</code>.
            </p>
          </form>
        </Card>
      </div>
    </>
  );
}
