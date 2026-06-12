import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { decideIntroAction } from "@/lib/actions";
import { getIntroView, reportFor, waitingOn, type IntroView } from "@/lib/intros";
import { getMissionView } from "@/lib/missions";
import { getAgentForUser } from "@/lib/core";
import { getSessionEvents, type SessionEvent } from "@/lib/sessions";
import { scoreMatch } from "@/lib/matching";
import { Avatar, Card, PageHeader, ProviderBadge, formatTime } from "@/components/ui";

/* ---------- progress stepper ---------- */

type StepState = "done" | "current" | "rejected" | "pending";

function Step({ state, label, sublabel }: { state: StepState; label: string; sublabel?: string }) {
  const circle =
    state === "done"
      ? "bg-emerald-500 text-white"
      : state === "current"
        ? "bg-white text-teal-600 ring-2 ring-teal-500"
        : state === "rejected"
          ? "bg-rose-500 text-white"
          : "bg-slate-100 text-slate-300";
  return (
    <div className="flex w-24 flex-col items-center gap-1.5 text-center">
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${circle}`}>
        {state === "done" ? "✓" : state === "rejected" ? "✕" : "●"}
      </span>
      <span
        className={`text-xs font-medium leading-tight ${
          state === "pending" ? "text-slate-400" : state === "rejected" ? "text-rose-600" : "text-slate-700"
        }`}
      >
        {label}
      </span>
      {sublabel && <span className="text-[10px] leading-tight text-slate-400">{sublabel}</span>}
    </div>
  );
}

function Stepper({ intro, viewerId }: { intro: IntroView; viewerId: string }) {
  const mine = intro.initiator_user_id === viewerId;
  const initName = mine ? "You" : intro.initiator_name;
  const targetName = mine ? intro.target_name : "You";
  const s = intro.status;

  const states: StepState[] =
    s === "awaiting_initiator_approval"
      ? ["done", "current", "pending", "pending"]
      : s === "awaiting_target_approval"
        ? ["done", "done", "current", "pending"]
        : s === "connected"
          ? ["done", "done", "done", "done"]
          : s === "declined_by_initiator"
            ? ["done", "rejected", "pending", "pending"]
            : ["done", "done", "rejected", "pending"]; // declined_by_target

  const connector = (i: number) => (
    <span className={`mt-3.5 h-px flex-1 ${states[i] === "done" ? "bg-emerald-300" : "bg-slate-200"}`} />
  );

  return (
    <Card className="px-6 py-5">
      <div className="flex items-start">
        <Step state={states[0]} label="Agents explored" sublabel="limited exchange" />
        {connector(1)}
        <Step state={states[1]} label={`${initName} decide${states[1] === "done" ? "d" : ""}`} sublabel="share contact?" />
        {connector(2)}
        <Step state={states[2]} label={`${targetName} decide${states[2] === "done" ? "d" : ""}`} sublabel="accept intro?" />
        {connector(3)}
        <Step state={states[3]} label="Connected" sublabel="emails exchanged" />
      </div>
    </Card>
  );
}

/* ---------- inline agent conversation ---------- */

function ConversationEvent({ e, viewerId }: { e: SessionEvent; viewerId: string }) {
  if (e.type === "session_started" || e.type === "session_completed") {
    return (
      <p className="py-1 text-center text-[11px] text-slate-400">
        {e.content} · {formatTime(e.created_at)}
      </p>
    );
  }
  if (e.type === "approval_decision") {
    const ok = e.kind === "approved";
    return (
      <p className={`py-1 text-center text-xs font-medium ${ok ? "text-emerald-600" : "text-rose-500"}`}>
        {ok ? "✓" : "✕"} {e.content}
      </p>
    );
  }
  if (e.kind === "proposal") {
    return (
      <div className="mx-auto my-1.5 w-fit max-w-[85%] rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">
          ⏸ Paused — owner approval required
        </p>
        <p className="mt-1 text-xs leading-relaxed text-amber-900">{e.content}</p>
      </div>
    );
  }
  const mine = e.actor_user_id === viewerId;
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} py-1`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          mine
            ? "rounded-br-md bg-teal-600/10 text-slate-800"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
        }`}
      >
        <p className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wide ${mine ? "text-teal-700" : "text-slate-400"}`}>
          {e.actor_label}
        </p>
        {e.content}
      </div>
    </div>
  );
}

/* ---------- report list ---------- */

function ReportList({
  icon,
  title,
  items,
  tone,
}: {
  icon: string;
  title: string;
  items: string[];
  tone: "good" | "warn" | "info";
}) {
  if (!items.length) return null;
  const toneCls = tone === "good" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : "text-slate-400";
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-600">
            <span className={`shrink-0 font-semibold ${toneCls}`}>{icon}</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- page ---------- */

export default async function IntroPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  let intro: IntroView;
  try {
    intro = getIntroView(user.id, id);
  } catch {
    notFound();
  }

  const mine = intro.initiator_user_id === user.id;
  const otherUserId = mine ? intro.target_user_id : intro.initiator_user_id;
  const otherName = mine ? intro.target_name : intro.initiator_name;
  const otherHandle = mine ? intro.target_handle : intro.initiator_handle;
  const otherAgent = getAgentForUser(otherUserId);
  const myAgent = getAgentForUser(user.id);
  const report = reportFor(intro, user.id);
  const needsMe = waitingOn(intro, user.id);
  const { events } = getSessionEvents(intro.session_id, user.id);
  const m = scoreMatch(myAgent, otherAgent);
  const matchedTerms = [...new Set([...m.forward, ...m.reverse])].slice(0, 10);

  const verdictTone = intro.match_score >= 60 ? "strong" : intro.match_score >= 25 ? "possible" : "weak";
  const waitingOnOther =
    (intro.status === "awaiting_initiator_approval" && !mine) ||
    (intro.status === "awaiting_target_approval" && mine);

  // If this intro executes one of the viewer's missions, link back to it.
  let mission: { id: string; title: string } | null = null;
  if (intro.mission_id) {
    try {
      const m = getMissionView(user.id, intro.mission_id);
      mission = { id: m.id, title: m.title };
    } catch {
      mission = null; // the mission belongs to the other side — not the viewer's to see
    }
  }

  return (
    <>
      <PageHeader
        title={`Introduction · ${otherName}`}
        subtitle={
          mine
            ? "Your agent explored this opportunity and prepared its assessment for you."
            : `${otherName}'s agent reached out — your agent evaluated it against your criteria.`
        }
        action={
          <span className="flex items-center gap-2">
            {mission && (
              <Link
                href={`/missions/${mission.id}`}
                className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
              >
                🎯 Mission: {mission.title}
              </Link>
            )}
            <Link
              href="/intros"
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
            >
              ← All introductions
            </Link>
          </span>
        }
      />

      <div className="space-y-6">
        {intro.status !== "not_relevant" ? (
          <Stepper intro={intro} viewerId={user.id} />
        ) : (
          <Card className="border-slate-200 bg-slate-50/60 p-5">
            <p className="text-sm font-medium text-slate-700">
              {otherName}&apos;s agent reviewed the request and it didn&apos;t match their criteria.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {otherName} was never interrupted — that&apos;s the filtering working as intended.
            </p>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Verdict */}
            <Card
              className={`p-6 ${
                verdictTone === "strong"
                  ? "border-emerald-200 bg-emerald-50/40"
                  : verdictTone === "possible"
                    ? "border-teal-200 bg-teal-50/30"
                    : "border-slate-200 bg-slate-50/40"
              }`}
            >
              <div className="flex flex-wrap items-center gap-5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Your agent&apos;s verdict
                  </p>
                  <p className="mt-1.5 text-base font-semibold leading-snug text-slate-900">
                    {report.recommendation}
                  </p>
                  <p className="mt-1.5 text-sm text-slate-500">Proposed next step: {report.proposed_next_step}</p>
                </div>
                <div className="flex flex-col items-center">
                  <span
                    className={`text-3xl font-bold tracking-tight ${
                      verdictTone === "strong"
                        ? "text-emerald-600"
                        : verdictTone === "possible"
                          ? "text-teal-700"
                          : "text-slate-400"
                    }`}
                  >
                    {intro.match_score}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">match score</span>
                  <div className="mt-1.5 h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        verdictTone === "strong" ? "bg-emerald-500" : verdictTone === "possible" ? "bg-teal-500" : "bg-slate-400"
                      }`}
                      style={{ width: `${intro.match_score}%` }}
                    />
                  </div>
                </div>
              </div>
              {matchedTerms.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {matchedTerms.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-white/80 px-2 py-0.5 font-mono text-xs text-teal-700 ring-1 ring-teal-100"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            {/* Decision */}
            {needsMe && (
              <Card className="border-amber-300 p-6 shadow-md shadow-amber-100/60">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-sm">✋</span>
                  <h2 className="text-sm font-semibold text-slate-900">Your decision</h2>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                  {mine
                    ? `Nothing has been shared yet. Approving sends ${otherName} an introduction request — and only if they also approve are your email addresses exchanged.`
                    : `${otherName} already approved on their side. Approving exchanges email addresses; rejecting declines politely — ${otherName} sees only the outcome, never your reasons.`}
                </p>
                <form action={decideIntroAction} className="mt-4">
                  <input type="hidden" name="introId" value={intro.id} />
                  <textarea
                    name="note"
                    rows={2}
                    placeholder="Optional note for your audit trail"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      name="decision"
                      value="approved"
                      className="rounded-xl bg-teal-700 hover:bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                    >
                      {mine ? "Approve & request introduction" : "Approve & exchange contact details"}
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

            {waitingOnOther && (
              <Card className="p-5">
                <p className="text-sm leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-800">Waiting for {otherName}.</span> Their agent is
                  holding your request until {otherName} reviews and approves it — nothing else is shared in the
                  meantime.
                </p>
              </Card>
            )}

            {intro.status === "connected" && (
              <Card className="border-emerald-200 bg-emerald-50/50 p-6">
                <h2 className="text-sm font-semibold text-emerald-900">You&apos;re connected 🎉</h2>
                <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                  Both of you approved, so your email addresses were exchanged and {otherName} is now in your
                  contacts. The next conversation is yours — your agents step back.
                </p>
                <Link href="/contacts" className="mt-3 inline-block text-sm font-semibold text-emerald-700 underline">
                  Open contacts →
                </Link>
              </Card>
            )}

            {(intro.status === "declined_by_initiator" || intro.status === "declined_by_target") && (
              <Card className="p-5">
                <p className="text-sm leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-800">This introduction was declined.</span> No contact
                  details were ever shared. The full record stays below for reference.
                </p>
              </Card>
            )}

            {/* Full report */}
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-slate-900">The full assessment</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{report.summary}</p>
              <div className="mt-5 space-y-5">
                <ReportList icon="✓" title="Why this may be relevant" items={report.match_reasons} tone="good" />
                <ReportList icon="!" title="Risks to keep in mind" items={report.risks} tone="warn" />
                <ReportList icon="?" title="What's still unknown" items={report.missing_info} tone="info" />
              </div>
            </Card>

            {/* Conversation */}
            <Card className="p-6">
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-slate-900 marker:text-slate-300">
                  Technical details · full agent conversation
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {events.length} events · every word on the record
                  </span>
                </summary>
                <div className="mt-4 space-y-0.5 rounded-2xl bg-slate-50/70 p-4">
                  {events.map((e) => (
                    <ConversationEvent key={e.id} e={e} viewerId={user.id} />
                  ))}
                </div>
                <Link
                  href={`/sessions/${intro.session_id}`}
                  className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:text-teal-900"
                >
                  Open full audit trail →
                </Link>
              </details>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <Avatar name={otherName} className="h-11 w-11 text-base" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{otherName}</p>
                  <p className="text-xs text-slate-400">@{otherHandle}</p>
                </div>
              </div>
              <div className="mt-3">
                <ProviderBadge provider={otherAgent.provider} />
              </div>
              {otherAgent.description && (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{otherAgent.description}</p>
              )}
              {otherAgent.goals && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Their goal</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{otherAgent.goals}</p>
                </div>
              )}
              {otherAgent.looking_for && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">They&apos;re looking for</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{otherAgent.looking_for}</p>
                </div>
              )}
              {otherAgent.tags && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {otherAgent.tags.split(",").map((t) => (
                    <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {t.trim()}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-sm font-semibold text-slate-900">How your agent protected you</h2>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-500">
                <li className="flex gap-2">
                  <span className="text-emerald-500">✓</span> Shared only what you pre-approved
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-500">✓</span> Stated your boundaries explicitly
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-500">✓</span> Returned a report, not a decision
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-500">✓</span> Holds contact details until both owners approve
                </li>
              </ul>
              <p className="mt-4 text-xs text-slate-400">
                Updated {formatTime(intro.updated_at)} · {intro.id}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
