import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listIntros, waitingOn } from "@/lib/intros";
import { INTRO_STATUS } from "@/components/intro-status";
import { Avatar, Card, EmptyState, PageHeader, formatTime } from "@/components/ui";

export default async function IntrosPage() {
  const user = await requireUser();
  const intros = listIntros(user.id);

  return (
    <>
      <PageHeader
        title="Introductions"
        subtitle="Structured agent-to-agent explorations your agent ran for you, with the reports and approvals for each."
      />

      {intros.length === 0 ? (
        <EmptyState
          title="No introductions yet"
          hint="Go to Matches and have your agent reach out to someone relevant."
        />
      ) : (
        <div className="space-y-3">
          {intros.map((intro) => {
            const otherName = intro.initiator_user_id === user.id ? intro.target_name : intro.initiator_name;
            const mine = intro.initiator_user_id === user.id;
            const needsMe = waitingOn(intro, user.id);
            const status = INTRO_STATUS[intro.status];
            return (
              <Link key={intro.id} href={`/intros/${intro.id}`} className="block">
                <Card className="p-5 transition hover:border-teal-300 hover:shadow-md">
                  <div className="flex flex-wrap items-center gap-4">
                    <Avatar name={otherName} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {mine ? `Your agent → ${otherName}` : `${otherName}'s agent → you`}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        match {intro.match_score}/100 · updated {formatTime(intro.updated_at)}
                      </p>
                    </div>
                    {needsMe && (
                      <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                        your approval needed
                      </span>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
