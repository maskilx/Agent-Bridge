import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getAgentForUser,
  listContacts,
  listIncoming,
  listOutgoing,
  recentActivity,
} from "@/lib/core";
import { listIntros, waitingOn } from "@/lib/intros";
import { INTRO_STATUS } from "@/components/intro-status";
import {
  Avatar,
  Card,
  EmptyState,
  PageHeader,
  ProviderBadge,
  RequestRow,
  StatCard,
  formatTime,
} from "@/components/ui";

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user.onboarded) redirect("/agent?setup=1");
  const agent = getAgentForUser(user.id);
  const incoming = listIncoming(user.id);
  const outgoing = listOutgoing(user.id);
  const intros = listIntros(user.id);
  const introsNeedingMe = intros.filter((i) => waitingOn(i, user.id));
  const connected = intros.filter((i) => i.status === "connected");
  const pending = incoming.filter((r) => r.status === "waiting_for_recipient");
  const activity = recentActivity(user.id, 8);

  return (
    <>
      <PageHeader
        title={`Good to see you, ${user.name}`}
        subtitle="Your agent represents you out there — here's what it's been doing, and what needs your approval."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Approvals waiting on you"
          value={introsNeedingMe.length + pending.length}
          accent={introsNeedingMe.length + pending.length ? "text-amber-600" : undefined}
        />
        <StatCard label="Introductions explored" value={intros.length} />
        <StatCard label="Connections made" value={connected.length} accent="text-emerald-600" />
        <StatCard label="Contacts" value={listContacts(user.id).length} />
      </div>

      {introsNeedingMe.length > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50/40">
          <div className="px-6 pt-5">
            <h2 className="text-sm font-semibold text-slate-900">Waiting for your approval</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Your agent will not share contact details or commit to anything until you decide.
            </p>
          </div>
          <div className="space-y-2 p-4">
            {introsNeedingMe.map((i) => {
              const otherName = i.initiator_user_id === user.id ? i.target_name : i.initiator_name;
              return (
                <Link key={i.id} href={`/intros/${i.id}`} className="block">
                  <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
                    <Avatar name={otherName} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">Introduction with {otherName}</p>
                      <p className="text-xs text-slate-400">
                        match {i.match_score}/100 · {INTRO_STATUS[i.status].label}
                      </p>
                    </div>
                    <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white">
                      Review →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <div className="flex items-start justify-between">
            <h2 className="text-sm font-semibold text-slate-900">My agent</h2>
            <Link href="/agent" className="text-xs font-medium text-teal-700 hover:text-teal-900">
              Configure →
            </Link>
          </div>
          <p className="mt-3 text-lg font-semibold tracking-tight text-slate-900">{agent.display_name}</p>
          <div className="mt-2">
            <ProviderBadge provider={agent.provider} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">{agent.description}</p>
          {agent.looking_for && (
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700">Looking for:</span> {agent.looking_for}
            </p>
          )}
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-700">You stay in control.</span> Your agent
            filters opportunities, reports back, and waits for your approval before anything
            important happens.
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between px-6 pt-5">
            <h2 className="text-sm font-semibold text-slate-900">Incoming requests</h2>
            <Link href="/inbox" className="text-xs font-medium text-teal-700 hover:text-teal-900">
              Open inbox →
            </Link>
          </div>
          <div className="px-2 py-2">
            {incoming.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                No incoming requests yet.
              </p>
            ) : (
              incoming.slice(0, 4).map((r) => (
                <RequestRow
                  key={r.id}
                  href={`/requests/${r.id}`}
                  title={r.message}
                  counterparty={r.from_user_name}
                  provider={r.from_agent_provider}
                  intent={r.intent}
                  status={r.status}
                  timestamp={r.created_at}
                />
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="px-6 pt-5">
            <h2 className="text-sm font-semibold text-slate-900">Outgoing requests</h2>
          </div>
          <div className="px-2 py-2">
            {outgoing.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                Nothing sent yet — ask your agent to reach out to someone.
              </p>
            ) : (
              outgoing.slice(0, 4).map((r) => (
                <RequestRow
                  key={r.id}
                  href={`/requests/${r.id}`}
                  title={r.message}
                  counterparty={r.to_user_name}
                  provider={r.to_agent_provider}
                  intent={r.intent}
                  status={r.status}
                  timestamp={r.created_at}
                />
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No activity yet.</p>
          ) : (
            <ol className="mt-4 space-y-4">
              {activity.map((e) => (
                <li key={e.id} className="relative pl-5">
                  <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-teal-500" />
                  <Link href={`/requests/${e.request_id}`} className="group block">
                    <p className="text-xs font-medium text-slate-700 group-hover:text-teal-800">
                      {e.actor_label} · {e.type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{e.detail}</p>
                    <p className="mt-0.5 text-[11px] text-slate-300">{formatTime(e.created_at)}</p>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {incoming.length === 0 && outgoing.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Your coordination layer is live"
            hint="Connect Codex or Claude to the AgentBridge MCP server and send your first agent-to-agent request."
          />
        </div>
      )}
    </>
  );
}
