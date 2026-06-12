import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listIntros, reportFor, waitingOn, type IntroView } from "@/lib/intros";
import { INTRO_STATUS } from "@/components/intro-status";
import { Avatar, Card, EmptyState, PageHeader, formatTime } from "@/components/ui";

function IntroCard({ intro, viewerId, emphasized }: { intro: IntroView; viewerId: string; emphasized?: boolean }) {
  const mine = intro.initiator_user_id === viewerId;
  const otherName = mine ? intro.target_name : intro.initiator_name;
  const status = INTRO_STATUS[intro.status];
  const report = reportFor(intro, viewerId);

  return (
    <Link href={`/intros/${intro.id}`} className="block">
      <Card
        className={`p-5 transition hover:border-teal-300 hover:shadow-md ${
          emphasized ? "border-amber-300 shadow-sm shadow-amber-100/60" : ""
        }`}
      >
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={otherName} className="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">{otherName}</p>
              <span className="text-xs text-slate-400">
                {mine ? "your agent reached out" : "their agent reached out"}
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-sm text-slate-500">{report.recommendation}</p>
            <p className="mt-1 text-xs text-slate-400">
              match {intro.match_score}/100 · updated {formatTime(intro.updated_at)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {emphasized ? (
              <span className="rounded-full bg-teal-700 hover:bg-teal-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm">
                Review &amp; decide →
              </span>
            ) : (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}>{status.label}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default async function IntrosPage() {
  const user = await requireUser();
  const intros = listIntros(user.id);

  const needYou = intros.filter((i) => waitingOn(i, user.id));
  const inProgress = intros.filter(
    (i) => !waitingOn(i, user.id) && ["awaiting_initiator_approval", "awaiting_target_approval"].includes(i.status)
  );
  const closed = intros.filter(
    (i) => !["awaiting_initiator_approval", "awaiting_target_approval"].includes(i.status)
  );

  return (
    <>
      <PageHeader
        title="Introductions"
        subtitle="Opportunities your agent explored on your behalf — reviewed, filtered, and waiting for nobody's approval but yours."
        action={
          <Link
            href="/matches"
            className="rounded-xl bg-teal-700 hover:bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Find new matches →
          </Link>
        }
      />

      {intros.length === 0 ? (
        <EmptyState
          title="No introductions yet"
          hint="Go to Matches and have your agent reach out to someone relevant — it reports back here."
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
                {needYou.map((i) => (
                  <IntroCard key={i.id} intro={i} viewerId={user.id} emphasized />
                ))}
              </div>
            </section>
          )}

          {inProgress.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">In progress</h2>
              <div className="space-y-3">
                {inProgress.map((i) => (
                  <IntroCard key={i.id} intro={i} viewerId={user.id} />
                ))}
              </div>
            </section>
          )}

          {closed.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-slate-500">History</h2>
              <div className="space-y-3">
                {closed.map((i) => (
                  <IntroCard key={i.id} intro={i} viewerId={user.id} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
