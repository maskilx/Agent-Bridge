import { db, newId } from "./db";
import { getAgentForUser, getUserById, type Agent } from "./core";
import { listIntrosByMission, requestIntro, type IntroView } from "./intros";
import { listMissionMatches, type MissionMatch } from "./matching";
import { groupsForContext } from "./groups";
import { interpretRequest, type DraftCandidate, type LLMSource } from "./model";

/**
 * Missions — the dynamic layer on top of the stable agent profile.
 *
 * The profile is WHO the agent is and its default boundaries; a mission is
 * WHAT the owner wants right now: a scoped, temporary mandate with its own
 * goal, share rules, targets, and approval policy. The flow:
 *
 *   user request → Mission Draft (model adapter or rules)
 *     → owner reviews / edits / approves (nothing external happens before this)
 *     → outreach to approved targets via the existing intro engine
 *     → reports + checkpoints exactly as before → result summary.
 */

export type MissionStatus =
  | "draft"
  | "awaiting_user_approval"
  | "approved"
  | "running"
  | "waiting_for_external_agent"
  | "waiting_for_user"
  | "completed"
  | "cancelled"
  | "rejected";

export type Mission = {
  id: string;
  owner_user_id: string;
  agent_id: string;
  title: string;
  user_request: string;
  goal: string;
  context: string;
  target_criteria: string;
  target_agent_ids: string; // JSON user ids
  allowed_to_share: string;
  must_not_share: string;
  approval_policy: string;
  expected_output: string;
  outreach_message: string;
  recommended_agent_ids: string; // JSON user ids
  draft_source: LLMSource;
  status: MissionStatus;
  result_summary: string;
  created_at: string;
  updated_at: string;
};

export type MissionView = Mission & { intros: IntroView[] };

const ACTIVE_STATUSES: MissionStatus[] = [
  "approved",
  "running",
  "waiting_for_external_agent",
  "waiting_for_user",
];

function touchMission(id: string) {
  db().prepare("UPDATE missions SET updated_at = datetime('now') WHERE id = ?").run(id);
}

function setMissionStatus(id: string, status: MissionStatus) {
  db()
    .prepare("UPDATE missions SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, id);
}

function getMissionRow(id: string): Mission | undefined {
  return db().prepare("SELECT * FROM missions WHERE id = ?").get(id) as Mission | undefined;
}

function requireOwnMission(userId: string, missionId: string): Mission {
  const mission = getMissionRow(missionId);
  if (!mission) throw new Error(`Mission ${missionId} not found.`);
  if (mission.owner_user_id !== userId) throw new Error("This mission belongs to a different owner.");
  return mission;
}

function candidatesFor(userId: string): DraftCandidate[] {
  return db()
    .prepare(
      `SELECT u.id AS user_id, u.handle, u.name, a.description, a.goals, a.looking_for, a.tags
       FROM users u JOIN agents a ON a.user_id = u.id
       WHERE u.id != ? AND u.onboarded = 1 AND a.visibility = 'searchable'`
    )
    .all(userId) as DraftCandidate[];
}

/* ---------------- lifecycle ---------------- */

export type AskResult = (
  | { kind: "clarify"; reply: string; question: string }
  | { kind: "draft"; reply: string; mission: MissionView }
) & {
  /** Observability: which layer produced this, and (if it fell back) why. */
  llmSource: LLMSource;
  fallbackReason?: string;
};

/**
 * "Ask my agent": interpret the owner's request. Either the agent asks ONE
 * clarifying question, or it creates a Mission Draft awaiting approval.
 * `history` carries earlier clarify Q&A from the same conversation.
 */
export async function askAgent(
  userId: string,
  request: string,
  history: { question: string; answer: string }[] = [],
  opts: { groupId?: string } = {}
): Promise<AskResult> {
  const trimmed = request.trim();
  if (trimmed.length < 3) throw new Error("Tell your agent what you want — a sentence or two.");
  if (trimmed.length > 2000) throw new Error("Keep the request under 2000 characters.");
  const user = getUserById(userId)!;
  const agent = getAgentForUser(userId);
  const candidates = candidatesFor(userId);
  // Group conversations the owner is part of, as background context (no LLM call;
  // explicit handoff via groupId always included, plus any the request references).
  const groupContext = groupsForContext(userId, trimmed, opts.groupId ? [opts.groupId] : []);

  const result = await interpretRequest({
    request: trimmed,
    history: history.slice(-4),
    user,
    agent,
    candidates,
    groupContext,
  });
  // Observability: one concise line per explicit mission request (no secrets).
  console.log(
    `[llm] interpret source=${result.source} groups=${groupContext.length}${result.fallbackReason ? ` reason="${result.fallbackReason}"` : ""}`
  );

  if (result.kind === "clarify") {
    return {
      kind: "clarify",
      reply: result.reply,
      question: result.question,
      llmSource: result.source,
      fallbackReason: result.fallbackReason,
    };
  }

  const { fields } = result;
  const byHandle = new Map(candidates.map((c) => [c.handle, c.user_id]));
  const targetIds = fields.target_handles.map((h) => byHandle.get(h)).filter(Boolean) as string[];
  const recommendedIds = fields.recommended_handles.map((h) => byHandle.get(h)).filter(Boolean) as string[];

  const fullRequest = history.length
    ? `${trimmed} (clarified: ${history.map((h) => h.answer).join("; ")})`
    : trimmed;

  const id = newId("mis");
  db()
    .prepare(
      `INSERT INTO missions (id, owner_user_id, agent_id, title, user_request, goal, context,
                             target_criteria, target_agent_ids, allowed_to_share, must_not_share,
                             approval_policy, expected_output, outreach_message, recommended_agent_ids,
                             draft_source, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_user_approval')`
    )
    .run(
      id,
      userId,
      agent.id,
      fields.title,
      fullRequest.slice(0, 2000),
      fields.goal,
      fields.context,
      fields.target_criteria,
      JSON.stringify(targetIds),
      fields.allowed_to_share,
      fields.must_not_share,
      fields.approval_policy,
      fields.expected_output,
      fields.outreach_message,
      JSON.stringify(recommendedIds),
      result.source
    );
  return {
    kind: "draft",
    reply: result.reply,
    mission: getMissionView(userId, id),
    llmSource: result.source,
    fallbackReason: result.fallbackReason,
  };
}

const EDITABLE_FIELDS = [
  "title",
  "goal",
  "context",
  "target_criteria",
  "allowed_to_share",
  "must_not_share",
  "approval_policy",
  "expected_output",
  "outreach_message",
] as const;

/** Owner edits the draft before approving. Only allowed while the mission awaits approval. */
export function updateMissionDraft(
  userId: string,
  missionId: string,
  fields: Partial<Record<(typeof EDITABLE_FIELDS)[number], string>>
): MissionView {
  const mission = requireOwnMission(userId, missionId);
  if (!["draft", "awaiting_user_approval"].includes(mission.status))
    throw new Error("Only a mission draft can be edited — this mission was already decided.");
  for (const key of EDITABLE_FIELDS) {
    const value = fields[key];
    if (value !== undefined) {
      db().prepare(`UPDATE missions SET ${key} = ? WHERE id = ?`).run(String(value).trim().slice(0, 2000), missionId);
    }
  }
  touchMission(missionId);
  return getMissionView(userId, missionId);
}

export type LaunchResult = { target_user_id: string; name: string; ok: boolean; note: string };

/**
 * Owner approves the mission. Outreach is launched ONLY to the targets the
 * owner selected on the approval screen (capped at 5) — each one runs through
 * the existing intro engine with the mission's share rules and checkpoints.
 */
export function approveMission(
  userId: string,
  missionId: string,
  targetUserIds: string[],
  opts: { outreachMessage?: string } = {}
): {
  mission: MissionView;
  launched: LaunchResult[];
} {
  const mission = requireOwnMission(userId, missionId);
  if (!["draft", "awaiting_user_approval"].includes(mission.status))
    throw new Error(`Mission ${missionId} was already decided (status: ${mission.status}).`);

  // The owner may have edited the outreach message right on the approval card.
  if (opts.outreachMessage?.trim()) {
    db()
      .prepare("UPDATE missions SET outreach_message = ? WHERE id = ?")
      .run(opts.outreachMessage.trim().slice(0, 700), missionId);
  }

  setMissionStatus(missionId, "running");

  const launched: LaunchResult[] = [];
  for (const targetId of [...new Set(targetUserIds)].slice(0, 5)) {
    const target = getUserById(targetId);
    if (!target) continue;
    try {
      requestIntro(userId, target.handle, { missionId });
      launched.push({ target_user_id: targetId, name: target.name, ok: true, note: "outreach started" });
    } catch (err) {
      launched.push({
        target_user_id: targetId,
        name: target.name,
        ok: false,
        note: err instanceof Error ? err.message : "outreach failed",
      });
    }
  }

  syncMission(missionId);
  return { mission: getMissionView(userId, missionId), launched };
}

/** Owner rejects the draft (before approval) or cancels a mission (after approval). */
export function cancelMission(userId: string, missionId: string): MissionView {
  const mission = requireOwnMission(userId, missionId);
  if (["completed", "cancelled", "rejected"].includes(mission.status))
    throw new Error(`Mission ${missionId} is already closed.`);
  const wasDraft = ["draft", "awaiting_user_approval"].includes(mission.status);
  setMissionStatus(missionId, wasDraft ? "rejected" : "cancelled");
  return getMissionView(userId, missionId);
}

/** Owner closes a mission with a result summary. */
export function completeMission(userId: string, missionId: string, resultSummary: string): MissionView {
  const mission = requireOwnMission(userId, missionId);
  if (["completed", "cancelled", "rejected"].includes(mission.status))
    throw new Error(`Mission ${missionId} is already closed.`);
  db()
    .prepare("UPDATE missions SET status = 'completed', result_summary = ?, updated_at = datetime('now') WHERE id = ?")
    .run(resultSummary.trim().slice(0, 2000) || mission.result_summary, missionId);
  return getMissionView(userId, missionId);
}

/* ---------------- status sync ---------------- */

/**
 * Derive an active mission's status from its intros (idempotent, called lazily
 * on reads — the same pattern syncIntros uses):
 *   any intro connected            → completed (with an auto result summary)
 *   any intro waiting on the owner → waiting_for_user
 *   any intro waiting on a target  → waiting_for_external_agent
 *   otherwise                      → running (with outcome notes)
 */
export function syncMission(missionId: string) {
  const mission = getMissionRow(missionId);
  if (!mission || !ACTIVE_STATUSES.includes(mission.status)) return;
  const intros = listIntrosByMission(missionId);
  if (!intros.length) {
    if (mission.status !== "running") setMissionStatus(missionId, "running");
    return;
  }

  const connected = intros.filter((i) => i.status === "connected");
  if (connected.length) {
    const names = connected.map((i) => i.target_name).join(", ");
    db()
      .prepare("UPDATE missions SET status = 'completed', result_summary = ?, updated_at = datetime('now') WHERE id = ?")
      .run(
        `Connected with ${names} — contact details exchanged after both sides approved. ` +
          `${intros.length - connected.length} other outreach attempt(s) did not connect.`,
        missionId
      );
    return;
  }

  let next: MissionStatus = "running";
  if (intros.some((i) => i.status === "awaiting_initiator_approval")) next = "waiting_for_user";
  else if (intros.some((i) => i.status === "awaiting_target_approval")) next = "waiting_for_external_agent";
  else {
    // every intro closed without connecting — record the outcome, keep mission running
    const notes = intros
      .map((i) => `${i.target_name}: ${i.status.replaceAll("_", " ")}`)
      .join("; ");
    db()
      .prepare("UPDATE missions SET result_summary = ?, updated_at = datetime('now') WHERE id = ?")
      .run(`Outreach so far — ${notes}. No connection yet; pick more targets or refine the mission.`, missionId);
  }
  if (mission.status !== next) setMissionStatus(missionId, next);
}

function syncUserMissions(userId: string) {
  const rows = db()
    .prepare(
      `SELECT id FROM missions WHERE owner_user_id = ? AND status IN ('approved','running','waiting_for_external_agent','waiting_for_user')`
    )
    .all(userId) as { id: string }[];
  for (const r of rows) syncMission(r.id);
}

/* ---------------- reads ---------------- */

export function listMissions(userId: string): MissionView[] {
  syncUserMissions(userId);
  const rows = db()
    .prepare("SELECT * FROM missions WHERE owner_user_id = ? ORDER BY updated_at DESC")
    .all(userId) as Mission[];
  return rows.map((m) => ({ ...m, intros: listIntrosByMission(m.id) }));
}

export function getMissionView(userId: string, missionId: string): MissionView {
  syncMission(missionId);
  const mission = requireOwnMission(userId, missionId);
  return { ...mission, intros: listIntrosByMission(mission.id) };
}

/** Targets ranked for this mission (named targets pinned first). */
export function missionMatches(userId: string, missionId: string): MissionMatch[] {
  const mission = requireOwnMission(userId, missionId);
  const agent = getAgentForUser(userId) as Agent;
  return listMissionMatches(userId, agent, mission);
}

/** Names of users referenced by a mission's target/recommended id lists. */
export function namedUsers(idsJson: string): { id: string; name: string; handle: string }[] {
  const ids = JSON.parse(idsJson || "[]") as string[];
  return ids
    .map((id) => getUserById(id))
    .filter(Boolean)
    .map((u) => ({ id: u!.id, name: u!.name, handle: u!.handle }));
}

/** True if this mission is waiting on the owner right now (draft review or intro decision). */
export function missionNeedsOwner(mission: Mission): boolean {
  return ["draft", "awaiting_user_approval", "waiting_for_user"].includes(mission.status);
}
