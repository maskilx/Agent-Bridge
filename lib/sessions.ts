import { db, newId } from "./db";
import { getAgentForUser, getUserById, resolveRecipient } from "./core";

export type Session = {
  id: string;
  topic: string;
  created_by_user_id: string;
  peer_user_id: string;
  status: "active" | "completed";
  summary: string;
  created_at: string;
  updated_at: string;
};

export type SessionEvent = {
  id: number;
  session_id: string;
  actor_user_id: string | null;
  actor_label: string;
  type: "session_started" | "message" | "approval_decision" | "session_completed";
  kind: string; // messages: update | proposal | approve | reject
  content: string;
  approval_status: "pending" | "approved" | "rejected" | null;
  approver_user_id: string | null;
  decided_via: string | null;
  created_at: string;
};

export type Checkpoint = SessionEvent & { topic: string; session_status: string };

export type SessionView = Session & {
  created_by_name: string;
  created_by_agent: string;
  created_by_provider: string;
  peer_name: string;
  peer_agent: string;
  peer_provider: string;
  last_event_id: number;
  pending_checkpoints: number;
};

const SESSION_SELECT = `
  SELECT s.*,
         cu.name AS created_by_name, ca.display_name AS created_by_agent, ca.provider AS created_by_provider,
         pu.name AS peer_name, pa.display_name AS peer_agent, pa.provider AS peer_provider,
         COALESCE((SELECT MAX(e.id) FROM session_events e WHERE e.session_id = s.id), 0) AS last_event_id,
         (SELECT COUNT(*) FROM session_events e
           WHERE e.session_id = s.id AND e.approval_status = 'pending') AS pending_checkpoints
  FROM sessions s
  JOIN users cu ON cu.id = s.created_by_user_id
  JOIN agents ca ON ca.user_id = cu.id
  JOIN users pu ON pu.id = s.peer_user_id
  JOIN agents pa ON pa.user_id = pu.id
`;

function touch(sessionId: string) {
  db().prepare("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?").run(sessionId);
}

function addSessionEvent(opts: {
  sessionId: string;
  actorUserId: string | null;
  actorLabel: string;
  type: SessionEvent["type"];
  kind?: string;
  content?: string;
  approvalStatus?: string | null;
  approverUserId?: string | null;
}): SessionEvent {
  const result = db()
    .prepare(
      `INSERT INTO session_events (session_id, actor_user_id, actor_label, type, kind, content, approval_status, approver_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      opts.sessionId,
      opts.actorUserId,
      opts.actorLabel,
      opts.type,
      opts.kind ?? "",
      opts.content ?? "",
      opts.approvalStatus ?? null,
      opts.approverUserId ?? null
    );
  touch(opts.sessionId);
  return db()
    .prepare("SELECT * FROM session_events WHERE id = ?")
    .get(result.lastInsertRowid) as SessionEvent;
}

export function getSessionView(id: string): SessionView | undefined {
  return db().prepare(`${SESSION_SELECT} WHERE s.id = ?`).get(id) as SessionView | undefined;
}

function requireParticipant(sessionId: string, userId: string): SessionView {
  const session = getSessionView(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found.`);
  if (session.created_by_user_id !== userId && session.peer_user_id !== userId)
    throw new Error("You are not a participant in this session.");
  return session;
}

export function startSession(opts: {
  userId: string;
  withRef: string;
  topic: string;
  message?: string;
}): SessionView {
  const creator = getUserById(opts.userId)!;
  const creatorAgent = getAgentForUser(creator.id);
  const peer = resolveRecipient(opts.userId, opts.withRef);
  if (!peer)
    throw new Error(
      `No registered agent found for "${opts.withRef}". Use search_agents to find the right handle.`
    );
  if (peer.id === creator.id) throw new Error("You cannot start a session with your own agent.");
  if (!opts.topic.trim()) throw new Error("A session topic is required.");

  const id = newId("ses");
  db()
    .prepare(
      "INSERT INTO sessions (id, topic, created_by_user_id, peer_user_id) VALUES (?, ?, ?, ?)"
    )
    .run(id, opts.topic.trim(), creator.id, peer.id);

  const peerAgent = getAgentForUser(peer.id);
  addSessionEvent({
    sessionId: id,
    actorUserId: creator.id,
    actorLabel: creatorAgent.display_name,
    type: "session_started",
    content: `Session opened with ${peerAgent.display_name} (${peerAgent.provider}): ${opts.topic.trim()}`,
  });
  if (opts.message?.trim()) {
    addSessionEvent({
      sessionId: id,
      actorUserId: creator.id,
      actorLabel: creatorAgent.display_name,
      type: "message",
      kind: "update",
      content: opts.message.trim(),
    });
  }
  return getSessionView(id)!;
}

export function listSessions(userId: string, activeOnly = true): SessionView[] {
  const where = activeOnly
    ? "WHERE (s.created_by_user_id = ? OR s.peer_user_id = ?) AND s.status = 'active'"
    : "WHERE s.created_by_user_id = ? OR s.peer_user_id = ?";
  return db()
    .prepare(`${SESSION_SELECT} ${where} ORDER BY s.updated_at DESC`)
    .all(userId, userId) as SessionView[];
}

export function getSessionEvents(
  sessionId: string,
  userId: string,
  sinceEventId = 0
): { session: SessionView; events: SessionEvent[] } {
  const session = requireParticipant(sessionId, userId);
  const events = db()
    .prepare("SELECT * FROM session_events WHERE session_id = ? AND id > ? ORDER BY id")
    .all(sessionId, sinceEventId) as SessionEvent[];
  return { session, events };
}

export function sendSessionMessage(opts: {
  userId: string;
  sessionId: string;
  message: string;
  kind?: "update" | "proposal" | "approve" | "reject";
  /** Who must sign off a proposal: the other participant, or the author's own owner. */
  approver?: "peer" | "self";
  via?: string;
}): { session: SessionView; event: SessionEvent } {
  const session = requireParticipant(opts.sessionId, opts.userId);
  if (session.status !== "active")
    throw new Error(`Session ${opts.sessionId} is already completed.`);
  const kind = opts.kind ?? "update";
  const actor = getUserById(opts.userId)!;
  const agent = getAgentForUser(actor.id);

  if (kind === "approve" || kind === "reject") {
    const decision = kind === "approve" ? "approved" : "rejected";
    const proposal = db()
      .prepare(
        `SELECT * FROM session_events
         WHERE session_id = ? AND approval_status = 'pending'
           AND (approver_user_id = ? OR (approver_user_id IS NULL AND actor_user_id != ?))
         ORDER BY id DESC LIMIT 1`
      )
      .get(opts.sessionId, opts.userId, opts.userId) as SessionEvent | undefined;
    if (!proposal) throw new Error("No pending checkpoint waiting on you in this session.");
    const event = decideProposal(
      opts.userId,
      proposal.id,
      decision as "approved" | "rejected",
      opts.message,
      opts.via
    );
    return { session: getSessionView(opts.sessionId)!, event };
  }

  if (!opts.message.trim()) throw new Error("Message text is required.");
  const peerId =
    session.created_by_user_id === actor.id ? session.peer_user_id : session.created_by_user_id;
  const event = addSessionEvent({
    sessionId: opts.sessionId,
    actorUserId: actor.id,
    actorLabel: agent.display_name,
    type: "message",
    kind,
    content: opts.message.trim(),
    approvalStatus: kind === "proposal" ? "pending" : null,
    approverUserId: kind === "proposal" ? (opts.approver === "self" ? actor.id : peerId) : null,
  });
  return { session: getSessionView(opts.sessionId)!, event };
}

function canDecide(proposal: SessionEvent, userId: string): boolean {
  if (proposal.approver_user_id) return proposal.approver_user_id === userId;
  return proposal.actor_user_id !== userId; // legacy checkpoints: the other participant decides
}

export function decideProposal(
  userId: string,
  proposalEventId: number,
  decision: "approved" | "rejected",
  note = "",
  via = "Web app",
  editedText?: string
): SessionEvent {
  const proposal = db()
    .prepare("SELECT * FROM session_events WHERE id = ?")
    .get(proposalEventId) as SessionEvent | undefined;
  if (!proposal || proposal.approval_status !== "pending")
    throw new Error("Checkpoint not found or already decided.");
  const session = requireParticipant(proposal.session_id, userId);
  if (session.status !== "active") throw new Error("Session is already completed.");
  if (!canDecide(proposal, userId))
    throw new Error("This checkpoint is waiting on a different owner's approval.");

  const edited = decision === "approved" && editedText?.trim() && editedText.trim() !== proposal.content;
  db()
    .prepare("UPDATE session_events SET approval_status = ?, decided_via = ?, content = ? WHERE id = ?")
    .run(decision, via, edited ? editedText!.trim() : proposal.content, proposalEventId);

  const actor = getUserById(userId)!;
  const agent = getAgentForUser(actor.id);
  const verb = edited ? "edited and approved" : decision;
  return addSessionEvent({
    sessionId: proposal.session_id,
    actorUserId: userId,
    actorLabel: agent.display_name,
    type: "approval_decision",
    kind: decision,
    content:
      `${actor.name} ${verb} the checkpoint via ${via}` +
      (note.trim() ? ` — “${note.trim()}”` : ""),
  });
}

export function listPendingApprovals(userId: string): Checkpoint[] {
  return db()
    .prepare(
      `SELECT e.*, s.topic, s.status AS session_status
       FROM session_events e JOIN sessions s ON s.id = e.session_id
       WHERE e.approval_status = 'pending' AND s.status = 'active'
         AND (e.approver_user_id = ?
              OR (e.approver_user_id IS NULL AND e.actor_user_id != ?
                  AND (s.created_by_user_id = ? OR s.peer_user_id = ?)))
       ORDER BY e.id DESC`
    )
    .all(userId, userId, userId, userId) as Checkpoint[];
}

export function getCheckpoint(userId: string, checkpointId: number): Checkpoint {
  const row = db()
    .prepare(
      `SELECT e.*, s.topic, s.status AS session_status
       FROM session_events e JOIN sessions s ON s.id = e.session_id WHERE e.id = ?`
    )
    .get(checkpointId) as Checkpoint | undefined;
  if (!row || row.kind !== "proposal") throw new Error(`Checkpoint ${checkpointId} not found.`);
  requireParticipant(row.session_id, userId);
  return row;
}

export function completeSession(opts: {
  userId: string;
  sessionId: string;
  summary?: string;
}): SessionView {
  const session = requireParticipant(opts.sessionId, opts.userId);
  if (session.status !== "active")
    throw new Error(`Session ${opts.sessionId} is already completed.`);
  const actor = getUserById(opts.userId)!;
  const agent = getAgentForUser(actor.id);
  const summary = (opts.summary ?? "").trim();

  db()
    .prepare("UPDATE sessions SET status = 'completed', summary = ?, updated_at = datetime('now') WHERE id = ?")
    .run(summary, opts.sessionId);
  addSessionEvent({
    sessionId: opts.sessionId,
    actorUserId: actor.id,
    actorLabel: agent.display_name,
    type: "session_completed",
    content: summary ? `Session completed — ${summary}` : "Session completed.",
  });
  return getSessionView(opts.sessionId)!;
}
