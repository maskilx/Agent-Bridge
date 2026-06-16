import { db, newId } from "./db";
import {
  createContact,
  getAgentForUser,
  getUserById,
  isTrustedContact,
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
import {
  RELEVANCE_THRESHOLD,
  scoreMatch,
  scoreMissionMatch,
  type MatchScore,
  type MissionLike,
} from "./matching";
import { sharedGroups } from "./groups";

/** Mission row fields the intro flow needs (read directly to avoid a module cycle with missions.ts). */
type MissionRow = MissionLike & {
  id: string;
  owner_user_id: string;
  title: string;
  allowed_to_share: string;
  must_not_share: string;
  outreach_message: string;
  status: string;
};

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
    | "awaiting_target_consent"
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
  mission_id: string | null;
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
  /** present when this exchange executes a mission */
  missionTitle?: string;
  /** groups both owners already belong to — shared context to build on */
  shared?: { title: string; goal: string }[];
}): IntroReport {
  const { owner, other, otherAgent, match, myTerms, theirTerms } = opts;

  const match_reasons: string[] = [];
  if (opts.shared?.length) {
    const g = opts.shared[0];
    match_reasons.push(
      `You're both already in ${
        opts.shared.length === 1 ? `the group "${g.title}"` : `${opts.shared.length} shared groups (e.g. "${g.title}")`
      }${g.goal ? ` — goal: ${g.goal}` : ""}, so there's shared context to build on.`
    );
  }
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
    risks.push(`${other.name}'s agent held some information back until they approve — normal at this stage.`);

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
      (opts.missionTitle
        ? `On the mission "${opts.missionTitle}", your agent and ${other.name}'s agent held a limited exchange (match score ${match.score}/100). `
        : `Your agent and ${other.name}'s agent held a limited exchange (match score ${match.score}/100). `) +
      `Only pre-approved information was shared; no contact details were exchanged. ` +
      `${other.name}: ${summarizeFor(otherAgent.description, "no description provided")}`,
    match_reasons,
    risks,
    missing_info,
    recommendation,
    proposed_next_step: `Exchange email addresses with ${other.name} and make a direct introduction.`,
  };
}

function getMissionForOutreach(missionId: string, initiatorUserId: string): MissionRow {
  const mission = db().prepare("SELECT * FROM missions WHERE id = ?").get(missionId) as
    | MissionRow
    | undefined;
  if (!mission) throw new Error(`Mission ${missionId} not found.`);
  if (mission.owner_user_id !== initiatorUserId)
    throw new Error("You can only run outreach for your own missions.");
  if (!["approved", "running", "waiting_for_external_agent", "waiting_for_user"].includes(mission.status))
    throw new Error(`Mission ${missionId} is not approved for outreach (status: ${mission.status}).`);
  return mission;
}

/** Owner A's agent reaches out to owner B's agent and runs the bounded exchange. */
export function requestIntro(
  initiatorUserId: string,
  targetRef: string,
  opts: { missionId?: string } = {}
): IntroView {
  const initiator = getUserById(initiatorUserId)!;
  const target = resolveRecipient(initiatorUserId, targetRef);
  if (!target) throw new Error(`No registered agent found for "${targetRef}".`);
  if (target.id === initiator.id) throw new Error("Your agent cannot introduce you to yourself.");
  // Missions are the owner's approved mandate: outreach only runs for approved missions.
  const mission = opts.missionId ? getMissionForOutreach(opts.missionId, initiatorUserId) : null;

  const existing = db()
    .prepare(
      `SELECT id, status FROM intros
       WHERE ((initiator_user_id = ? AND target_user_id = ?) OR (initiator_user_id = ? AND target_user_id = ?))
         AND status IN ('awaiting_target_consent', 'awaiting_initiator_approval', 'awaiting_target_approval', 'connected')`
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

  // Inbound policy: a "contacts-only" agent turns away agents of people who
  // aren't in its owner's contacts — before any exchange happens.
  if (theirAgent.inbound_policy === "contacts" && !isTrustedContact(target.id, initiator.id)) {
    throw new Error(
      `${target.name} only accepts introductions from their existing contacts right now.`
    );
  }

  if (!mission && !myAgent.looking_for.trim() && !myAgent.goals.trim())
    throw new Error("Set your agent's goals and what you're looking for before reaching out.");

  // Mission-specific mandate (goal + share rules) overrides the static profile defaults.
  const match = mission ? scoreMissionMatch(mission, myAgent, theirAgent) : scoreMatch(myAgent, theirAgent);
  // People's own names/handles aren't meaningful "match reasons" — drop them from the terms.
  const nameTokens = new Set(
    [initiator.name, initiator.handle, target.name, target.handle]
      .flatMap((s) => s.toLowerCase().split(/\s+/))
  );
  match.forward = match.forward.filter((t) => !nameTokens.has(t));
  match.reverse = match.reverse.filter((t) => !nameTokens.has(t));

  // PRIVACY INVARIANT: the opening message is the ONLY thing the other side
  // receives from this owner. For missions it is the user-approved outreach
  // message, verbatim. It must never enumerate or hint at what is withheld —
  // internal policy (must-not-share lists, approval rules, the raw request)
  // stays inside AgentBridge.
  const openingMessage = mission?.outreach_message?.trim()
    ? mission.outreach_message.trim()
    : `Hi — I represent ${initiator.name}, who is exploring ${summarizeFor(myAgent.goals, "relevant conversations")} ` +
      `Some public background: ${summarizeFor(myAgent.may_share, myAgent.description || "see profile")} ` +
      `Would ${target.name} be open to a short intro to see if there's mutual relevance?`;

  // 1. Initiator's agent opens the session with the approved message only.
  const session = startSession({
    userId: initiator.id,
    withRef: target.handle,
    topic: mission
      ? `Mission outreach — ${mission.title}: ${initiator.name} ↔ ${target.name}`
      : `Intro exploration: ${initiator.name} ↔ ${target.name}`,
    message: openingMessage,
  });

  // Named mission targets were explicitly approved by the owner, so the
  // counterpart agent still evaluates them, but borderline scores get through.
  const namedTarget = mission
    ? (JSON.parse(mission.target_agent_ids || "[]") as string[]).includes(target.id)
    : false;
  const relevant = match.score >= RELEVANCE_THRESHOLD || namedTarget;

  // Inbound consent: a target on "ask me first" holds a RELEVANT request from a
  // non-contact until they allow it — their agent doesn't engage or share until then.
  const needsConsent =
    relevant &&
    theirAgent.inbound_policy === "approval" &&
    !isTrustedContact(target.id, initiator.id);

  // Groups both already share — gives the 1:1 exchange context to build on.
  const shared = sharedGroups(initiator.id, target.id).map((g) => ({ title: g.title, goal: g.goal }));

  // Structured reports for both owners — internal analysis built from public
  // profiles; sharing nothing externally, so safe to compute before consent.
  const reportForInitiator = buildReport({
    owner: initiator,
    ownerAgent: myAgent,
    other: target,
    otherAgent: theirAgent,
    match,
    myTerms: match.forward,
    theirTerms: match.reverse,
    missionTitle: mission?.title,
    shared,
  });
  const reportForTarget = buildReport({
    owner: target,
    ownerAgent: theirAgent,
    other: initiator,
    otherAgent: myAgent,
    match,
    myTerms: match.reverse,
    theirTerms: match.forward,
    shared,
  });

  let status: Intro["status"];
  let initiatorCheckpointId: number | null = null;

  if (!relevant) {
    // Target's agent declines politely without involving its owner.
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
    status = "not_relevant";
  } else if (needsConsent) {
    // Hold: the target's agent does NOT engage or share until the owner allows it.
    sendSessionMessage({
      userId: target.id,
      sessionId: session.id,
      message:
        `${target.name} reviews new agents before their agent engages. I'm holding your request for ${target.name} to allow — ` +
        `nothing has been shared in return yet.`,
    });
    status = "awaiting_target_consent";
  } else {
    // Trusted / open: the target's agent engages and the initiator self-checkpoint is armed.
    initiatorCheckpointId = engageAndArm({
      initiator,
      target,
      theirAgent,
      reverse: match.reverse,
      sessionId: session.id,
      recommendation: reportForInitiator.recommendation,
    });
    status = "awaiting_initiator_approval";
  }

  const id = newId("int");
  db()
    .prepare(
      `INSERT INTO intros (id, initiator_user_id, target_user_id, session_id, status, match_score,
                           report_for_initiator, report_for_target, initiator_checkpoint_id, mission_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      initiator.id,
      target.id,
      session.id,
      status,
      match.score,
      JSON.stringify(reportForInitiator),
      JSON.stringify(reportForTarget),
      initiatorCheckpointId,
      mission?.id ?? null
    );
  return getIntroById(id)!;
}

/**
 * The target's agent engages (sharing only its owner's allowed info) and the
 * initiator's self-checkpoint is armed. Used both for immediate exchanges and
 * after a target grants inbound consent. Returns the initiator checkpoint id.
 */
function engageAndArm(opts: {
  initiator: User;
  target: User;
  theirAgent: Agent;
  reverse: string[];
  sessionId: string;
  recommendation: string;
}): number {
  const { initiator, target, theirAgent, reverse, sessionId, recommendation } = opts;
  sendSessionMessage({
    userId: target.id,
    sessionId,
    message:
      `This looks relevant to ${target.name}'s goals${reverse.length ? ` (overlap on: ${reverse.slice(0, 6).join(", ")})` : ""}. ` +
      `Some background I can offer: ${summarizeFor(theirAgent.may_share, "see the public profile")} ` +
      `Happy to go deeper once both owners agree to connect.`,
  });
  sendSessionMessage({
    userId: initiator.id,
    sessionId,
    message:
      `Thank you — I have enough for a structured report. I'm returning to ${initiator.name} with a summary, ` +
      `match assessment, and a recommendation. No contact details are exchanged until both owners approve.`,
  });
  const { event } = sendSessionMessage({
    userId: initiator.id,
    sessionId,
    kind: "proposal",
    approver: "self",
    message:
      `Approval requested from ${initiator.name}: share your contact details (email) with ${target.name} ` +
      `and request an introduction. Agent recommendation: ${recommendation}`,
  });
  return event.id;
}

/**
 * The target decides whether to let an unknown agent engage (inbound consent).
 * Approve → their agent engages and the normal approval flow begins; reject →
 * declined, nothing shared.
 */
export function consentToIntro(
  userId: string,
  introId: string,
  decision: "approved" | "rejected"
): IntroView {
  const intro = getIntroById(introId);
  if (!intro) throw new Error(`Introduction ${introId} not found.`);
  if (intro.target_user_id !== userId)
    throw new Error("Only the recipient can allow this conversation to start.");
  if (intro.status !== "awaiting_target_consent") return intro;

  const initiator = getUserById(intro.initiator_user_id)!;
  const target = getUserById(intro.target_user_id)!;

  if (decision === "rejected") {
    completeSession({
      userId: target.id,
      sessionId: intro.session_id,
      summary: `${target.name} chose not to engage — nothing was shared.`,
    });
    setIntroStatus(intro.id, "declined_by_target");
    return getIntroById(introId)!;
  }

  const theirAgent = getAgentForUser(target.id);
  const myAgent = getAgentForUser(initiator.id);
  const match = scoreMatch(myAgent, theirAgent);
  const report = JSON.parse(intro.report_for_initiator) as IntroReport;
  const checkpointId = engageAndArm({
    initiator,
    target,
    theirAgent,
    reverse: match.reverse,
    sessionId: intro.session_id,
    recommendation: report.recommendation,
  });
  db()
    .prepare(
      "UPDATE intros SET initiator_checkpoint_id = ?, status = 'awaiting_initiator_approval', updated_at = datetime('now') WHERE id = ?"
    )
    .run(checkpointId, intro.id);
  return getIntroById(introId)!;
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

/** All intros launched by a mission (execution trail). */
export function listIntrosByMission(missionId: string): IntroView[] {
  syncIntros();
  return db()
    .prepare(`${INTRO_SELECT} WHERE i.mission_id = ? ORDER BY i.updated_at DESC`)
    .all(missionId) as IntroView[];
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
    (intro.status === "awaiting_target_consent" && intro.target_user_id === userId) ||
    (intro.status === "awaiting_initiator_approval" && intro.initiator_user_id === userId) ||
    (intro.status === "awaiting_target_approval" && intro.target_user_id === userId)
  );
}
