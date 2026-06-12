import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAgentForUser, listIncoming } from "@/lib/core";
import { listIntros, waitingOn } from "@/lib/intros";
import { listMissions, missionNeedsOwner } from "@/lib/missions";
import { MISSION_STATUS } from "@/components/mission-status";
import { INTRO_STATUS } from "@/components/intro-status";
import { Avatar, Card, PageHeader, ProviderBadge, formatTime } from "@/components/ui";

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user.onboarded) redirect("/agent?setup=1");
  const agent = getAgentForUser(user.id);
  const missions = listMissions(user.id);
  const intros = listIntros(user.id);

  const missionsNeedingMe = missions.filter((m) => missionNeedsOwner(m) && m.status !== "waiting_for_user");
  const introsNeedingMe = intros.filter((i) => waitingOn(i, user.id));
  const pendingRequests = listIncoming(user.id, true);
  const activeMissions = missions.filter((m) =>
    ["approved", "running", "waiting_for_external_agent", "waiting_for_user"].includes(m.status)
  );
  const activeIntros = intros.filter((i) =>
    ["awaiting_initiator_approval", "awaiting_target_approval"].includes(i.status)
  );

  const profileReady = Boolean(agent.looking_for.trim() || agent.goals.trim());
  const nextAction = !profileReady
    ? { href: "/agent", label: "Finish your agent's profile so it knows what to pursue →" }
    : introsNeedingMe.length
      ? {
          href: `/intros/${introsNeedingMe[0].id}`,
          label: `Review the introduction with ${
            introsNeedingMe[0].initiator_user_id === user.id
              ? introsNeedingMe[0].target_name
              : introsNeedingMe[0].initiator_name
          } →`,
        }
      : missionsNeedingMe.length
        ? { href: `/missions/${missionsNeedingMe[0].id}`, label: `Approve the mission draft “${missionsNeedingMe[0].title}” →` }
        : activeMissions.length
          ? { href: `/missions/${activeMissions[0].id}`, label: `Check on “${activeMissions[0].title}” →` }
          : null;

  return (
    <>
      <PageHeader
        title={`Your agent is standing by, ${user.name.split(" ")[0]}`}
        subtitle="Tell it what you want — it drafts a mission, asks what it may share, and returns only with what matters."
      />

      {/* Hero: ask the agent (continues as a chat on /ask) */}
      <Card className="relative overflow-hidden border-teal-200 p-6">
        <div className="aura" aria-hidden />
        <form action="/ask" method="GET" className="relative flex flex-col gap-3 sm:flex-row sm:items-start">
          <textarea
            name="q"
            rows={2}
            required
            placeholder="What do you want your agent to do?  e.g. “Find me a GTM cofounder” or “Ask Noa if she's open to an intro, but don't share product details”"
            className="min-h-[64px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-teal-700 hover:bg-teal-800 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Ask my agent →
          </button>
        </form>
        <p className="relative mt-2.5 text-xs text-slate-500">
          Your agent replies in chat with a mission draft — you see the exact outreach message and
          approve before anything is sent.
        </p>
      </Card>

      {nextAction && (
        <Link href={nextAction.href} className="mt-4 block">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-3.5 transition hover:shadow-md">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm">→</span>
            <p className="text-sm font-semibold text-slate-800">{nextAction.label}</p>
          </div>
        </Link>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Approvals */}
          {(missionsNeedingMe.length > 0 || introsNeedingMe.length > 0 || pendingRequests.length > 0) && (
            <Card className="border-amber-200 bg-amber-50/30">
              <div className="px-6 pt-5">
                <h2 className="text-sm font-semibold text-slate-900">Waiting for your approval</h2>
                <p className="mt-0.5 text-xs text-slate-500">Nothing proceeds without you.</p>
              </div>
              <div className="space-y-2 p-4">
                {missionsNeedingMe.map((m) => (
                  <Link key={m.id} href={`/missions/${m.id}`} className="block">
                    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
                      <span className="text-base">🎯</span>
                      <span className="flex-1 text-sm font-semibold text-slate-800">Mission draft: {m.title}</span>
                      <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white">Review →</span>
                    </div>
                  </Link>
                ))}
                {introsNeedingMe.map((i) => {
                  const other = i.initiator_user_id === user.id ? i.target_name : i.initiator_name;
                  return (
                    <Link key={i.id} href={`/intros/${i.id}`} className="block">
                      <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
                        <Avatar name={other} className="h-7 w-7 text-xs" />
                        <span className="flex-1 text-sm font-semibold text-slate-800">Introduction with {other}</span>
                        <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white">Decide →</span>
                      </div>
                    </Link>
                  );
                })}
                {pendingRequests.slice(0, 3).map((r) => (
                  <Link key={r.id} href={`/requests/${r.id}`} className="block">
                    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
                      <span className="text-base">✉️</span>
                      <span className="flex-1 truncate text-sm text-slate-700">
                        <span className="font-semibold">{r.from_user_name}</span>: {r.message}
                      </span>
                      <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white">Reply →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Recent missions */}
          <Card>
            <div className="flex items-center justify-between px-6 pt-5">
              <h2 className="text-sm font-semibold text-slate-900">Recent missions</h2>
              <Link href="/missions" className="text-xs font-medium text-teal-700 hover:text-teal-900">
                All missions →
              </Link>
            </div>
            <div className="space-y-2 p-4">
              {missions.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-slate-400">
                  No missions yet — tell your agent what you want, above.
                </p>
              ) : (
                missions.slice(0, 4).map((m) => (
                  <Link key={m.id} href={`/missions/${m.id}`} className="block">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 transition hover:border-teal-200 hover:shadow-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800">{m.title}</span>
                        <span className="text-xs text-slate-400">updated {formatTime(m.updated_at)}</span>
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${MISSION_STATUS[m.status].cls}`}>
                        {MISSION_STATUS[m.status].label}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* Active introductions */}
          {activeIntros.length > 0 && (
            <Card>
              <div className="flex items-center justify-between px-6 pt-5">
                <h2 className="text-sm font-semibold text-slate-900">Active introductions</h2>
                <Link href="/intros" className="text-xs font-medium text-teal-700 hover:text-teal-900">
                  All introductions →
                </Link>
              </div>
              <div className="space-y-2 p-4">
                {activeIntros.slice(0, 4).map((i) => {
                  const other = i.initiator_user_id === user.id ? i.target_name : i.initiator_name;
                  return (
                    <Link key={i.id} href={`/intros/${i.id}`} className="block">
                      <div className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 transition hover:border-teal-200 hover:shadow-sm">
                        <Avatar name={other} className="h-7 w-7 text-xs" />
                        <span className="flex-1 text-sm font-semibold text-slate-800">{other}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${INTRO_STATUS[i.status].cls}`}>
                          {INTRO_STATUS[i.status].label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar: the agent */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Your agent</h2>
              <Link href="/agent" className="text-xs font-medium text-teal-700 hover:text-teal-900">
                Configure →
              </Link>
            </div>
            <p className="mt-3 text-lg font-semibold tracking-tight text-slate-900">{agent.display_name}</p>
            <div className="mt-2">
              <ProviderBadge provider={agent.provider} />
            </div>
            {agent.looking_for && (
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                <span className="font-semibold text-slate-700">Default brief:</span> {agent.looking_for}
              </p>
            )}
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700">You stay in control.</span> Missions define
              what it may do right now; your profile defines what it may never do.
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-900">At a glance</h2>
            <dl className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <dt>Missions in flight</dt>
                <dd className="font-semibold text-slate-900">{activeMissions.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Introductions in progress</dt>
                <dd className="font-semibold text-slate-900">{activeIntros.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Connections made</dt>
                <dd className="font-semibold text-emerald-600">
                  {intros.filter((i) => i.status === "connected").length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Waiting on you</dt>
                <dd
                  className={`font-semibold ${
                    missionsNeedingMe.length + introsNeedingMe.length + pendingRequests.length
                      ? "text-amber-600"
                      : "text-slate-900"
                  }`}
                >
                  {missionsNeedingMe.length + introsNeedingMe.length + pendingRequests.length}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
