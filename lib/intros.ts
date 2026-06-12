import { db, newId } from "./db";
import {
  createContact,
  getAgentForUser,
  getUserById,
  listContacts,
  resolveRecipient,
  type Agent,
  type User,
} from "./core";
import {
  completeSession,
  decideProposal,
  sendSessionMessage,
  startSession,
  type SessionEvent,
} from "./sessions";
import { RELEVANCE_THRESHOLD, scoreMatch, type MatchScore } from "./matching";

/**
 * Structured agent-to-agent introductions — the V1 core loop.
 *
 * 1. Owner A asks their agent to reach out to owner B's agent.
 * 2. The two agents hold a bounded exchange inside a normal session,
 *    sharing ONLY each profile's "may share" information.
 * 3. B's agent checks relevance against B's own criteria; an irrelevant
 *    request is declined politely without ever involving B.
 * 4. Each owner gets a structured report (summary, match reasons, risks,
 *    missing info, recommendation) — never a raw decision.
 * 5. Contact details are exchanged only after BOTH owners approve, via the
 *    same checkpoint machinery used everywhere else (web UI and MCP).
 */

export type IntroReport = {
  summary: string;
  match_reasons: string[];
  risks: string[];
  missing_info: string[];
  recommendation: string;
  proposed_next_step: string;
};

export type Intro = {
  id: string;
  initiator_user_id: string;
  target_user_id: string;
  session_id: string;
  status:
    | "not_relevant"
    | "awaiting_initiator_approval"
    | "awaiting_target_approval"
    | "connected"
    | "declined_by_initiator"
    | "declined_by_target";
  match_score: number;
  report_for_initiator: string;
  report_for_target: string;
  initiator_checkpoint_id: number | null;
  target_checkpoint_id: number | null;
  created_at: string;
  updated_at: string;
};

export type IntroView = Intro & {
  initiator_name: string;
  initiator_handle: string;
  initiator_agent_name: string;
  target_name: string;
  target_handle: string;
  target_agent_name: string;
};

const INTRO_SELECT = `
  SELECT i.*,
         iu.name AS initiator_name, iu.handle AS initiator_handle, ia.display_name AS initiator_agent_name,
         tu.name AS target_name, tu.handle AS target_handle, ta.display_name AS target_agent_name
  FROM intros i
  JOIN users iu ON iu.id = i.initiator_user_id
  JOIN agents ia ON ia.user_id = iu.id
  JOIN users tu ON tu.id = i.target_user_id
  JOIN agents ta ON ta.user_id = tu.id
`;

function setIntroStatus(id: string, status: Intro["status"]) {
  db()
    .prepare("UPDATE intros SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, id);
}

function summarizeFor(text: string, fallback: string): string {
  const t = text.trim();
  return t ? t : fallback;
}

function buildReport(opts: {
  owner: User;
  ownerAgent: Agent;
  other: User;
  otherAgent: Agent;
  match: MatchScore;
  /** terms relevant from this owner's perspective */
  myTerms: string[];
  theirTerms: string[];
}): IntroReport {
  const { owner, other, otherAgent, match, myTerms, theirTerms } = opts;

  const match_reasons: string[] = [];
  if (myTerms.length)
    match_reasons.push(
      `Their profile matches what you're looking for on: ${myTerms.slice(0, 8).join(", ")}.`
    );
  if (theirTerms.length)
    match_reasons.push(
      `Your profile matches what they're looking for on: ${theirTerms.slice(0, 8).join(", ")}.`
    );
  if (otherAgent.goals.trim()) match_reasons.push(`${other.name}'s stated goal: ${otherAgent.goals.trim()}`);
  if (!match_reasons.length) match_reasons.push("No meaningful overlap was found between the two profiles.");

  const risks: string[] = ["All information is self-reported by the other agent — nothing has been verified."];
  if (!theirTerms.length)
    risks.push(`The interest may be one-sided: nothing in your profile matches what ${other.name} says they are looking for.`);
  if (!myTerms.length)
    risks.push(`Nothing in ${other.name}'s profile matches your stated criteria.`);
  if (otherAgent.must_not_share.trim())
    risks.push(`${other.name}'s agent is withholding some information pending their approval: ${otherAgent.must_not_share.trim()}`);

  const missing_info: string[] = [];
  if (!otherAgent.goals.trim()) missing_info.push("They list no goals on their agent profile.");
  if (!otherAgent.looking_for.trim()) missing_info.push("They don't state what they are looking for.");
  if (!otherAgent.may_share.trim()) missing_info.push("They shared no background information.");
  if (!missing_info.length)
    missing_info.push("Commitment level, timeline, and equity expectations were not discussed.");

  const recommendation =
    match.score >= 60
      ? "Strong mutual overlap — recommend approving the introduction and scheduling a first call."
      : match.score >= RELEVANCE_THRESHOLD
        ? "Possible fit — a short intro call is worth it, but verify the gaps listed above first."
        : "Weak overlap — recommend passing unless something above stands out to you.";

  return {
    summary:
      `Your agent and ${other.name}'s agent held a limited exchange (match score ${match.score}/100). ` +
      `Only pre-approved profile information was shared; no contact details were exchanged. ` +
      `${other.name}: ${summarizeFor(otherAgent.description, "no description provided")}`,
    match_reasons,
    risks,
    missing_info,
    recommendation,
    proposed_next_step: `Exchange email addresses with ${other.name} and make a direct introduction.`,
  };
}

/** Owner A's agent reaches out to owner B's agent and runs the bounded exchange. */
export function requestIntro(initiatorUserId: string, targetRef: string): IntroView {
  const initiator = getUserById(initiatorUserId)!;
  const target = resolveRecipient(initiatorUserId, targetRef);
  if (!target) throw new Error(`No registered agent found for "${targetRef}".`);
  if (target.id === initiator.id) throw new Error("Your agent cannot introduce you to yourself.");

  const existing = db()
    .prepare(
      `SELECT id, status FROM intros
       WHERE ((initiator_user_id = ? AND target_user_id = ?) OR (initiator_user_id = ? AND target_user_id = ?))
         AND status IN ('awaiting_initiator_approval', 'awaiting_target_approval', 'connected')`
    )
    .get(initiator.id, target.id, target.id, initiator.id) as { id: string; status: string } | undefined;
  if (existing)
    throw new Error(
      existing.status === "connected"
        ? `You are already connected with this person (intro ${existing.id}).`
        : `An introduction with this person is already in progress (intro ${existing.id}).`
    );

  const myAgent = getAgentForUser(initiator.id);
  const theirAgent = getAgentForUser(target.id);
  if (!myAgent.looking_for.trim() && !myAgent.goals.trim())
    throw new Error("Set your agent's goals and what you're looking for before reaching out.");

  const match = scoreMatch(myAgent, theirAgent);

  // 1. Initiator's agent opens the session sharing only approved information.
  const session = startSession({
    userId: initiator.id,
    withRef: target.handle,
    topic: `Cofounder intro exploration: ${initiator.name} ↔ ${target.name}`,
    message:
      `Hi, I represent ${initiator.name}. ` +
      `Goal: ${summarizeFor(myAgent.goals, "not specified")}. ` +
      `Looking for: ${summarizeFor(myAgent.looking_for, "not specified")}. ` +
      `What I can share now: ${summarizeFor(myAgent.may_share, "nothing beyond this profile")}. ` +
      `I cannot share the following without ${initiator.name}'s approval: ${summarizeFor(myAgent.must_not_share, "n/a")}.`,
  });

  const relevant = match.score >= RELEVANCE_THRESHOLD;

  // 2. Target's agent checks relevance against its OWN owner's criteria.
  if (!relevant) {
    sendSessionMessage({
      userId: target.id,
      sessionId: session.id,
      message:
        `I checked this against ${target.name}'s criteria (looking for: ${summarizeFor(theirAgent.looking_for, "not specified")}). ` +
        `It does not look like a fit right now (match score ${match.score}/100), so I'm declining politely without involving ${target.name}.`,
    });
    completeSession({
      userId: initiator.id,
      sessionId: session.id,
      summary: `Not relevant — ${target.name}'s agent declined (score ${match.score}/100).`,
    });
  } else {
    sendSessionMessage({
      userId: target.id,
      sessionId: session.id,
      message:
        `This looks relevant to ${target.name}'s goals${match.reverse.length ? ` (overlap on: ${match.reverse.slice(0, 6).join(", ")})` : ""}. ` +
        `What I can share now: ${summarizeFor(theirAgent.may_share, "nothing beyond this profile")}. ` +
        `Not shareable without ${target.name}'s approval: ${summarizeFor(theirAgent.must_not_share, "n/a")}.`,
    });
    sendSessionMessage({
      userId: initiator.id,
      sessionId: session.id,
      message:
        `Thank you — I have enough for a structured report. I'm returning to ${initiator.name} with a summary, ` +
        `match assessment, and a recommendation. No contact details are exchanged until both owners approve.`,
    });
  }

  // 3. Structured reports for both owners.
  const reportForInitiator = buildReport({
    owner: initiator,
    ownerAgent: myAgent,
    other: target,
    otherAgent: theirAgent,
    match,
    myTerms: match.forward,
    theirTerms: match.reverse,
  });
  const reportForTarget = buildReport({
    owner: target,
    ownerAgent: theirAgent,
    other: initiator,
    otherAgent: myAgent,
    match,
    myTerms: match.reverse,
    theirTerms: match.forward,
  });

  // 4. If relevant, ask the INITIATOR's own approval first (self-checkpoint).
  let initiatorCheckpointId: number | null = null;
  if (relevant) {
    const { event } = sendSessionMessage({
      userId: initiator.id,
      sessionId: session.id,
      kind: "proposal",
      approver: "self",
      message:
        `Approval requested from ${initiator.name}: share your contact details (email) with ${target.name} ` +
        `and request an introduction. Agent recommendation: ${reportForInitiator.recommendation}`,
    });
    initiatorCheckpointId = event.id;
  }

  const id = newId("int");
  db()
    .prepare(
      `INSERT INTO intros (id, initiator_user_id, target_user_id, session_id, status, match_score,
                           report_for_initiator, report_for_target, initiator_checkpoint_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      initiator.id,
      target.id,
      session.id,
      relevant ? "awaiting_initiator_approval" : "not_relevant",
      match.score,
      JSON.stringify(reportForInitiator),
      JSON.stringify(reportForTarget),
      initiatorCheckpointId
    );
  return getIntroById(id)!;
}

function getIntroById(id: string): IntroView | undefined {
  return db().prepare(`${INTRO_SELECT} WHERE i.id = ?`).get(id) as IntroView | undefined;
}

function checkpointStatus(eventId: number | null): string | null {
  if (!eventId) return null;
  const row = db()
    .prepare("SELECT approval_status FROM session_events WHERE id = ?")
    .get(eventId) as { approval_status: string | null } | undefined;
  return row?.approval_status ?? null;
}

/**
 * Advance intro state machines based on checkpoint decisions, wherever those
 * decisions were made (web UI, MCP approve_checkpoint, session approve message).
 * Called lazily before reads and after decisions — idempotent.
 */
export function syncIntros() {
  const pending = db()
    .prepare("SELECT * FROM intros WHERE status IN ('awaiting_initiator_approval', 'awaiting_target_approval')")
    .all() as Intro[];

  for (const intro of pending) {
    const initiator = getUserById(intro.initiator_user_id)!;
    const target = getUserById(intro.target_user_id)!;

    if (intro.status === "awaiting_initiator_approval") {
      const decision = checkpointStatus(intro.initiator_checkpoint_id);
      if (decision === "rejected") {
        completeSession({
          userId: intro.initiator_user_id,
          sessionId: intro.session_id,
          summary: `${initiator.name} declined to proceed — no contact details were shared.`,
        });
        setIntroStatus(intro.id, "declined_by_initiator");
      } else if (decision === "approved") {
        const report = JSON.parse(intro.report_for_target) as IntroReport;
        const { event } = sendSessionMessage({
          userId: intro.initiator_user_id,
          sessionId: intro.session_id,
          kind: "proposal",
          approver: "peer",
          message:
            `Introduction request for ${target.name}: ${initiator.name} approved sharing contact details and ` +
            `would like to connect. Agent assessment for ${target.name}: ${report.recommendation} ` +
            `Approve to exchange email addresses; reject to decline politely.`,
        });
        db()
          .prepare("UPDATE intros SET target_checkpoint_id = ?, updated_at = datetime('now') WHERE id = ?")
          .run(event.id, intro.id);
        setIntroStatus(intro.id, "awaiting_target_approval");
      }
    } else if (intro.status === "awaiting_target_approval") {
      const decision = checkpointStatus(intro.target_checkpoint_id);
      if (decision === "rejected") {
        completeSession({
          userId: intro.target_user_id,
          sessionId: intro.session_id,
          summary: `${target.name} declined the introduction — no contact details were shared.`,
        });
        setIntroStatus(intro.id, "declined_by_target");
      } else if (decision === "approved") {
        sendSessionMessage({
          userId: intro.target_user_id,
          sessionId: intro.session_id,
          message:
            `Both owners approved. Exchanging contact details: ${initiator.name} <${initiator.email}> ↔ ` +
            `${target.name} <${target.email}>. The owners take it from here.`,
        });
        // Add each party to the other's contacts (skip duplicates).
        const have = (ownerId: string, email: string) =>
          listContacts(ownerId).some((c) => c.email === email);
        if (!have(initiator.id, target.email))
          createContact({
            ownerUserId: initiator.id,
            name: target.name,
            email: target.email,
            handle: target.handle,
            relationship: "cofounder intro via AgentBridge",
          });
        if (!have(target.id, initiator.email))
          createContact({
            ownerUserId: target.id,
            name: initiator.name,
            email: initiator.email,
            handle: initiator.handle,
            relationship: "cofounder intro via AgentBridge",
          });
        completeSession({
          userId: intro.target_user_id,
          sessionId: intro.session_id,
          summary: `Connected — both owners approved and contact details were exchanged.`,
        });
        setIntroStatus(intro.id, "connected");
      }
    }
  }
}

/** Decide the checkpoint an intro is currently waiting on (web UI path). */
export function decideIntro(
  userId: string,
  introId: string,
  decision: "approved" | "rejected",
  note = ""
): IntroView {
  syncIntros();
  const intro = getIntroById(introId);
  if (!intro) throw new Error(`Introduction ${introId} not found.`);
  const checkpointId =
    intro.status === "awaiting_initiator_approval"
      ? intro.initiator_checkpoint_id
      : intro.status === "awaiting_target_approval"
        ? intro.target_checkpoint_id
        : null;
  if (!checkpointId) throw new Error("This introduction is not waiting on an approval.");
  decideProposal(userId, checkpointId, decision, note, "Web app");
  syncIntros();
  return getIntroById(introId)!;
}

export function listIntros(userId: string): IntroView[] {
  syncIntros();
  return db()
    .prepare(`${INTRO_SELECT} WHERE i.initiator_user_id = ? OR i.target_user_id = ? ORDER BY i.updated_at DESC`)
    .all(userId, userId) as IntroView[];
}

export function getIntroView(userId: string, id: string): IntroView {
  syncIntros();
  const intro = getIntroById(id);
  if (!intro) throw new Error(`Introduction ${id} not found.`);
  if (intro.initiator_user_id !== userId && intro.target_user_id !== userId)
    throw new Error("You are not a participant in this introduction.");
  return intro;
}

/** The report meant for this viewer (each side sees its own). */
export function reportFor(intro: IntroView, userId: string): IntroReport {
  return JSON.parse(
    intro.initiator_user_id === userId ? intro.report_for_initiator : intro.report_for_target
  ) as IntroReport;
}

/** True if this intro is waiting on this user's decision right now. */
export function waitingOn(intro: IntroView, userId: string): boolean {
  return (
    (intro.status === "awaiting_initiator_approval" && intro.initiator_user_id === userId) ||
    (intro.status === "awaiting_target_approval" && intro.target_user_id === userId)
  );
}
