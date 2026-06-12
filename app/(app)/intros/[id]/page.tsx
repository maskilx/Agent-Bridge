import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { decideIntroAction } from "@/lib/actions";
import { getIntroView, reportFor, waitingOn } from "@/lib/intros";
import { INTRO_STATUS } from "@/components/intro-status";
import { Avatar, Card, PageHeader, formatTime } from "@/components/ui";

function ReportSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-600">
            <span className="text-slate-300">—</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function IntroPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  let intro;
  try {
    intro = getIntroView(user.id, id);
  } catch {
    notFound();
  }

  const mine = intro.initiator_user_id === user.id;
  const otherName = mine ? intro.target_name : intro.initiator_name;
  const report = reportFor(intro, user.id);
  const needsMe = waitingOn(intro, user.id);
  const status = INTRO_STATUS[intro.status];

  return (
    <>
      <PageHeader
        title={`Introduction: ${otherName}`}
        subtitle={
          mine
            ? `Your agent reached out to ${otherName}'s agent and reported back.`
            : `${otherName}'s agent reached out to your agent. Review your agent's assessment below.`
        }
        action={
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Avatar name={otherName} />
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Your agent&apos;s report</h2>
                <p className="text-xs text-slate-400">
                  match score {intro.match_score}/100 · {formatTime(intro.updated_at)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-700">{report.summary}</p>
            <div className="mt-5 space-y-5">
              <ReportSection title="Why this may be relevant" items={report.match_reasons} />
              <ReportSection title="Risks" items={report.risks} />
              <ReportSection title="Missing information" items={report.missing_info} />
            </div>
            <div className="mt-5 rounded-2xl border border-teal-200 bg-teal-50/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                Agent recommendation
              </h3>
              <p className="mt-1.5 text-sm font-medium text-teal-900">{report.recommendation}</p>
              <p className="mt-1 text-xs text-teal-700">Proposed next step: {report.proposed_next_step}</p>
            </div>
          </Card>

          {needsMe && (
            <Card className="border-amber-200 bg-amber-50/40 p-6">
              <h2 className="text-sm font-semibold text-slate-900">Your approval is needed</h2>
              <p className="mt-1 text-sm text-slate-600">
                {mine
                  ? `Approve to share your contact details with ${otherName} and request the introduction. Nothing has been shared yet.`
                  : `${otherName} has approved on their side. Approve to exchange contact details, or reject to decline politely — ${otherName} only sees the outcome, not your reasons.`}
              </p>
              <form action={decideIntroAction} className="mt-4">
                <input type="hidden" name="introId" value={intro.id} />
                <textarea
                  name="note"
                  rows={2}
                  placeholder="Optional note for the audit trail"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
                <div className="mt-3 flex gap-3">
                  <button
                    type="submit"
                    name="decision"
                    value="approved"
                    className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                  >
                    {mine ? "Approve — request introduction" : "Approve — exchange contact details"}
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="rejected"
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600"
                  >
                    Reject
                  </button>
                </div>
              </form>
            </Card>
          )}

          {intro.status === "connected" && (
            <Card className="border-emerald-200 bg-emerald-50/50 p-6">
              <h2 className="text-sm font-semibold text-emerald-900">You are connected 🎉</h2>
              <p className="mt-1 text-sm text-emerald-800">
                Both owners approved. {otherName} has been added to your contacts with their email
                address — the next step is yours, not your agent&apos;s.
              </p>
              <Link href="/contacts" className="mt-3 inline-block text-sm font-semibold text-emerald-700 underline">
                View contacts →
              </Link>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-900">How this worked</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-slate-500">
              <li>The initiating agent shared only its owner&apos;s pre-approved information.</li>
              <li>The receiving agent checked relevance against its own owner&apos;s criteria.</li>
              <li>Both owners received a structured report — not a raw transcript decision.</li>
              <li>Contact details are exchanged only after both owners approve.</li>
            </ol>
          </Card>
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-900">Full audit trail</h2>
            <p className="mt-1 text-xs text-slate-400">
              Every message and approval in this exploration is recorded.
            </p>
            <Link
              href={`/sessions/${intro.session_id}`}
              className="mt-3 inline-block rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-800"
            >
              View agent conversation →
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
