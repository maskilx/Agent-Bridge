import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listMissions, missionNeedsOwner, type MissionView } from "@/lib/missions";
import { MISSION_STATUS } from "@/components/mission-status";
import { Card, EmptyState, PageHeader, formatTime } from "@/components/ui";

function MissionCard({ mission, emphasized }: { mission: MissionView; emphasized?: boolean }) {
  const status = MISSION_STATUS[mission.status];
  const introNote = mission.intros.length
    ? `${mission.intros.length} outreach · ${mission.intros.filter((i) => i.status === "connected").length} connected`
    : "no outreach yet";
  return (
    <Link href={`/missions/${mission.id}`} className="block">
      <Card
        className={`p-5 transition hover:border-teal-300 hover:shadow-md ${
          emphasized ? "border-amber-300 shadow-sm shadow-amber-100/60" : ""
        }`}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{mission.title}</p>
            <p className="mt-1 line-clamp-1 text-sm text-slate-500">“{mission.user_request}”</p>
            <p className="mt-1 text-xs text-slate-400">
              {introNote} · updated {formatTime(mission.updated_at)}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}>
            {status.label}
          </span>
        </div>
      </Card>
    </Link>
  );
}

export default async function MissionsPage() {
  const user = await requireUser();
  const missions = listMissions(user.id);

  const needYou = missions.filter((m) => missionNeedsOwner(m));
  const active = missions.filter(
    (m) => !missionNeedsOwner(m) && ["approved", "running", "waiting_for_external_agent"].includes(m.status)
  );
  const closed = missions.filter((m) => ["completed", "cancelled", "rejected"].includes(m.status));

  return (
    <>
      <PageHeader
        title="Missions"
        subtitle="Everything you've tasked your agent with — drafts to approve, work in progress, and outcomes."
        action={
          <Link
            href="/ask"
            className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Ask my agent →
          </Link>
        }
      />

      {missions.length === 0 ? (
        <EmptyState
          title="No missions yet"
          hint='Try "Find me a GTM cofounder" or "Ask Noa if she is open to a short intro."'
        />
      ) : (
        <div className="space-y-8">
          {needYou.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                Waiting on you
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {needYou.length}
                </span>
              </h2>
              <div className="space-y-3">
                {needYou.map((m) => (
                  <MissionCard key={m.id} mission={m} emphasized />
                ))}
              </div>
            </section>
          )}
          {active.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">In progress</h2>
              <div className="space-y-3">
                {active.map((m) => (
                  <MissionCard key={m.id} mission={m} />
                ))}
              </div>
            </section>
          )}
          {closed.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-slate-500">History</h2>
              <div className="space-y-3">
                {closed.map((m) => (
                  <MissionCard key={m.id} mission={m} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
