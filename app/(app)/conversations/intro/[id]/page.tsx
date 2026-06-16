import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { consentToIntroAction, decideIntroAction } from "@/lib/actions";
import { getAgentForUser } from "@/lib/core";
import { getIntroView, reportFor, type IntroView } from "@/lib/intros";
import { getSessionEvents } from "@/lib/sessions";
import { Bubble, ChatHeader, PinnedCard, SystemNote } from "@/components/chat";

export default async function IntroChatPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  let intro: IntroView;
  try {
    intro = getIntroView(user.id, id);
  } catch {
    notFound();
  }

  const mine = intro.initiator_user_id === user.id;
  const otherName = mine ? intro.target_name : intro.initiator_name;
  const otherUserId = mine ? intro.target_user_id : intro.initiator_user_id;
  const otherAgent = getAgentForUser(otherUserId);
  const report = reportFor(intro, user.id);
  const { events } = getSessionEvents(intro.session_id, user.id);

  const needsConsent = intro.status === "awaiting_target_consent" && !mine;
  const awaitingConsent = intro.status === "awaiting_target_consent" && mine;
  const needsDecision =
    (intro.status === "awaiting_initiator_approval" && mine) ||
    (intro.status === "awaiting_target_approval" && !mine);
  const waitingOther =
    (intro.status === "awaiting_initiator_approval" && !mine) ||
    (intro.status === "awaiting_target_approval" && mine);

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        title={otherName}
        subtitle={`Introduction · their agent runs on ${otherAgent.provider}`}
        avatars={[otherName]}
        action={
          <Link
            href={`/p/${mine ? intro.target_handle : intro.initiator_handle}`}
            className="hidden rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:text-teal-700 sm:block"
          >
            View profile
          </Link>
        }
      />

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5">
        <SystemNote>
          Your agents are exchanging only public profile info. No contact details are shared until you both approve.
        </SystemNote>

        {events.map((e) => {
          if (e.type === "session_started" || e.type === "session_completed")
            return <SystemNote key={e.id}>{e.content}</SystemNote>;
          if (e.kind === "proposal") return null; // shown as the pinned card below
          const me = e.actor_user_id === user.id;
          return (
            <Bubble key={e.id} me={me} sender={me ? undefined : e.actor_label} agent time={e.created_at}>
              {e.content}
            </Bubble>
          );
        })}

        {/* Agent's read, as a pinned note */}
        {intro.status !== "not_relevant" && report.recommendation && (
          <PinnedCard tone="slate">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Your agent&apos;s read</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-slate-700">{report.recommendation}</p>
          </PinnedCard>
        )}

        {needsConsent && (
          <PinnedCard tone="amber">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Allow this conversation?</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-slate-700">
              {otherName}&apos;s agent wants to start a conversation with yours. Nothing has been shared in return yet —
              if you allow it, your agent shares only what you&apos;ve permitted, and you still approve before any intro.
            </p>
            <div className="mt-3 flex gap-2.5">
              <ConsentBtn introId={intro.id} decision="approved" label="Allow my agent to engage" primary />
              <ConsentBtn introId={intro.id} decision="rejected" label="Decline" />
            </div>
          </PinnedCard>
        )}

        {needsDecision && (
          <PinnedCard tone="amber">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Your decision</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-slate-700">
              {mine
                ? `Approve to send ${otherName} an introduction request — your email is shared only if they also approve.`
                : `${otherName} approved. Approve to exchange email addresses; decline to pass — they only see the outcome.`}
            </p>
            <div className="mt-3 flex gap-2.5">
              <DecideBtn introId={intro.id} decision="approved" label={mine ? "Approve & request" : "Approve & connect"} primary />
              <DecideBtn introId={intro.id} decision="rejected" label="Decline" />
            </div>
          </PinnedCard>
        )}

        {awaitingConsent && <SystemNote>Waiting for {otherName} to allow the conversation — nothing further shared.</SystemNote>}
        {waitingOther && <SystemNote>Waiting for {otherName} to decide — your agent holds here.</SystemNote>}
        {intro.status === "connected" && (
          <PinnedCard tone="emerald">
            <p className="text-[14px] font-medium text-emerald-900">You&apos;re connected 🎉</p>
            <p className="mt-1 text-[13px] leading-relaxed text-emerald-800">
              Both of you approved — email addresses were exchanged and {otherName} is in your contacts.
            </p>
          </PinnedCard>
        )}
      </div>
    </div>
  );
}

function ConsentBtn({ introId, decision, label, primary }: { introId: string; decision: string; label: string; primary?: boolean }) {
  return (
    <form action={consentToIntroAction}>
      <input type="hidden" name="introId" value={introId} />
      <input type="hidden" name="decision" value={decision} />
      <button
        className={
          primary
            ? "rounded-xl bg-teal-700 px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-teal-800"
            : "rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600"
        }
      >
        {label}
      </button>
    </form>
  );
}

function DecideBtn({ introId, decision, label, primary }: { introId: string; decision: string; label: string; primary?: boolean }) {
  return (
    <form action={decideIntroAction}>
      <input type="hidden" name="introId" value={introId} />
      <input type="hidden" name="decision" value={decision} />
      <button
        className={
          primary
            ? "rounded-xl bg-teal-700 px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-teal-800"
            : "rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600"
        }
      >
        {label}
      </button>
    </form>
  );
}
