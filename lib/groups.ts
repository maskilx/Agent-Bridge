import { db, newId } from "./db";
import { getAgentForUser, getUserById } from "./core";

/**
 * Agent groups — a shared goal + multiple owners (and their agents) + a shared
 * timeline. The MVP keeps it simple and safe:
 *  - Each agent only ever contributes profile-level (already-shareable) info.
 *  - "Ask the group" is rule-based (no model calls) — each member agent posts a
 *    short response derived from its public profile.
 *  - "Summarize" is the only LLM touch, and only on an explicit click.
 *  - Sensitive sharing / connecting still goes through the existing intro
 *    approval flow — groups don't bypass owner approval.
 */

export type GroupMember = {
  userId: string;
  name: string;
  handle: string;
  agentName: string;
};

export type GroupMessage = {
  id: string;
  author_user_id: string | null;
  author_label: string;
  kind: "message" | "agent" | "system" | "summary";
  content: string;
  created_at: string;
};

export type GroupSummary = {
  id: string;
  title: string;
  goal: string;
  owner_user_id: string;
  memberCount: number;
  updatedAt: string;
};

export type ProposalDecision = {
  userId: string;
  name: string;
  decision: "approved" | "rejected" | "pending";
};

export type GroupProposalView = {
  id: string;
  action: string;
  shares: string;
  status: "pending" | "approved" | "rejected";
  proposerUserId: string;
  proposerName: string;
  createdAt: string;
  decisions: ProposalDecision[];
};

export type GroupView = {
  id: string;
  title: string;
  goal: string;
  ownerUserId: string;
  members: GroupMember[];
  messages: GroupMessage[];
  proposals: GroupProposalView[];
};

function isMember(groupId: string, userId: string): boolean {
  return Boolean(
    db().prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(groupId, userId)
  );
}

function postMessage(opts: {
  groupId: string;
  authorUserId: string | null;
  authorLabel: string;
  kind: GroupMessage["kind"];
  content: string;
}) {
  db()
    .prepare(
      "INSERT INTO group_messages (id, group_id, author_user_id, author_label, kind, content) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(newId("gmsg"), opts.groupId, opts.authorUserId, opts.authorLabel, opts.kind, opts.content);
}

export function createGroup(opts: {
  ownerUserId: string;
  title: string;
  goal: string;
  memberUserIds: string[];
}): string {
  const id = newId("grp");
  db()
    .prepare("INSERT INTO groups (id, owner_user_id, title, goal) VALUES (?, ?, ?, ?)")
    .run(id, opts.ownerUserId, opts.title.trim() || "Untitled group", opts.goal.trim());

  const add = db().prepare("INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)");
  const ids = new Set([opts.ownerUserId, ...opts.memberUserIds]);
  for (const uid of ids) if (getUserById(uid)) add.run(id, uid);

  const owner = getUserById(opts.ownerUserId);
  postMessage({
    groupId: id,
    authorUserId: null,
    authorLabel: "AgentBridge",
    kind: "system",
    content: `${owner?.name ?? "Someone"} created this group${opts.goal.trim() ? ` — goal: ${opts.goal.trim()}` : ""}. Member agents share only public profile info here; nothing sensitive is shared without each owner's approval.`,
  });
  return id;
}

export function listGroups(userId: string): GroupSummary[] {
  return db()
    .prepare(
      `SELECT g.id, g.title, g.goal, g.owner_user_id,
              (SELECT COUNT(*) FROM group_members m2 WHERE m2.group_id = g.id) AS memberCount,
              (SELECT MAX(created_at) FROM group_messages gm WHERE gm.group_id = g.id) AS updatedAt
       FROM groups g
       JOIN group_members m ON m.group_id = g.id AND m.user_id = ?
       ORDER BY updatedAt DESC`
    )
    .all(userId) as GroupSummary[];
}

export function getGroupView(userId: string, groupId: string): GroupView | null {
  const g = db().prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as
    | { id: string; title: string; goal: string; owner_user_id: string }
    | undefined;
  if (!g || !isMember(groupId, userId)) return null;

  const members = db()
    .prepare(
      `SELECT u.id AS userId, u.name, u.handle, a.display_name AS agentName
       FROM group_members m JOIN users u ON u.id = m.user_id
       LEFT JOIN agents a ON a.user_id = u.id
       WHERE m.group_id = ? ORDER BY u.name`
    )
    .all(groupId) as GroupMember[];

  const messages = db()
    .prepare("SELECT * FROM group_messages WHERE group_id = ? ORDER BY created_at, rowid")
    .all(groupId) as GroupMessage[];

  const proposalRows = db()
    .prepare(
      `SELECT p.*, u.name AS proposer_name
       FROM group_proposals p JOIN users u ON u.id = p.proposer_user_id
       WHERE p.group_id = ? ORDER BY p.created_at, p.rowid`
    )
    .all(groupId) as {
    id: string;
    action: string;
    shares: string;
    status: "pending" | "approved" | "rejected";
    proposer_user_id: string;
    proposer_name: string;
    created_at: string;
  }[];
  const decisionRows = db()
    .prepare(
      `SELECT d.proposal_id, d.user_id, d.decision FROM group_proposal_decisions d
       JOIN group_proposals p ON p.id = d.proposal_id WHERE p.group_id = ?`
    )
    .all(groupId) as { proposal_id: string; user_id: string; decision: "approved" | "rejected" }[];

  const proposals: GroupProposalView[] = proposalRows.map((p) => ({
    id: p.id,
    action: p.action,
    shares: p.shares,
    status: p.status,
    proposerUserId: p.proposer_user_id,
    proposerName: p.proposer_name,
    createdAt: p.created_at,
    decisions: members.map((m) => {
      const d = decisionRows.find((r) => r.proposal_id === p.id && r.user_id === m.userId);
      return { userId: m.userId, name: m.name, decision: d ? d.decision : ("pending" as const) };
    }),
  }));

  return { id: g.id, title: g.title, goal: g.goal, ownerUserId: g.owner_user_id, members, messages, proposals };
}

/** Members of a group (user ids). */
function memberIds(groupId: string): string[] {
  return (
    db().prepare("SELECT user_id FROM group_members WHERE group_id = ?").all(groupId) as {
      user_id: string;
    }[]
  ).map((r) => r.user_id);
}

/** Recompute a proposal's status from its decisions: any reject → rejected;
 *  all members approved → approved; otherwise pending. Posts a resolution note. */
function recomputeProposal(groupId: string, proposalId: string, action: string, shares: string) {
  const members = memberIds(groupId);
  const decisions = db()
    .prepare("SELECT user_id, decision FROM group_proposal_decisions WHERE proposal_id = ?")
    .all(proposalId) as { user_id: string; decision: string }[];
  const rejecter = decisions.find((d) => d.decision === "rejected");
  const approved = decisions.filter((d) => d.decision === "approved").length;

  let status: "pending" | "approved" | "rejected" = "pending";
  if (rejecter) status = "rejected";
  else if (approved >= members.length) status = "approved";

  db()
    .prepare("UPDATE group_proposals SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, proposalId);

  if (status === "approved") {
    postMessage({
      groupId,
      authorUserId: null,
      authorLabel: "AgentBridge",
      kind: "system",
      content: `All members approved: ${action}.${shares.trim() ? ` Now shared with the group: ${shares.trim()}.` : ""}`,
    });
  } else if (status === "rejected") {
    const who = getUserById(rejecter!.user_id);
    postMessage({
      groupId,
      authorUserId: null,
      authorLabel: "AgentBridge",
      kind: "system",
      content: `Proposal declined — ${who?.name ?? "a member"} did not approve: ${action}. Nothing was shared.`,
    });
  }
}

export function proposeGroupAction(opts: {
  userId: string;
  groupId: string;
  action: string;
  shares: string;
}): void {
  if (!isMember(opts.groupId, opts.userId)) throw new Error("You are not a member of this group.");
  const action = opts.action.trim().slice(0, 600);
  if (!action) throw new Error("Describe the action you're proposing.");
  const id = newId("gprop");
  db()
    .prepare(
      "INSERT INTO group_proposals (id, group_id, proposer_user_id, action, shares) VALUES (?, ?, ?, ?, ?)"
    )
    .run(id, opts.groupId, opts.userId, action, opts.shares.trim().slice(0, 600));
  // The proposer consents by proposing.
  db()
    .prepare("INSERT OR IGNORE INTO group_proposal_decisions (proposal_id, user_id, decision) VALUES (?, ?, 'approved')")
    .run(id, opts.userId);

  const proposer = getUserById(opts.userId);
  postMessage({
    groupId: opts.groupId,
    authorUserId: opts.userId,
    authorLabel: proposer?.name ?? "A member",
    kind: "system",
    content: `${proposer?.name ?? "A member"} proposed a group action that needs everyone's approval: ${action}`,
  });
  recomputeProposal(opts.groupId, id, action, opts.shares);
}

export function decideGroupProposal(opts: {
  userId: string;
  proposalId: string;
  decision: "approved" | "rejected";
}): void {
  const p = db()
    .prepare("SELECT * FROM group_proposals WHERE id = ?")
    .get(opts.proposalId) as
    | { id: string; group_id: string; action: string; shares: string; status: string }
    | undefined;
  if (!p) throw new Error("Proposal not found.");
  if (!isMember(p.group_id, opts.userId)) throw new Error("You are not a member of this group.");
  if (p.status !== "pending") return; // already resolved

  db()
    .prepare(
      `INSERT INTO group_proposal_decisions (proposal_id, user_id, decision) VALUES (?, ?, ?)
       ON CONFLICT(proposal_id, user_id) DO UPDATE SET decision = excluded.decision, created_at = datetime('now')`
    )
    .run(opts.proposalId, opts.userId, opts.decision);
  recomputeProposal(p.group_id, p.id, p.action, p.shares);
}

export function postGroupMessage(userId: string, groupId: string, content: string) {
  if (!isMember(groupId, userId)) throw new Error("You are not a member of this group.");
  const text = content.trim();
  if (!text) return;
  const u = getUserById(userId)!;
  postMessage({ groupId, authorUserId: userId, authorLabel: u.name, kind: "message", content: text.slice(0, 2000) });
}

/**
 * Rule-based: each OTHER member's agent posts a short response derived from its
 * public profile (goal + what they're looking for). No model calls.
 */
export function askGroup(userId: string, groupId: string) {
  const view = getGroupView(userId, groupId);
  if (!view) throw new Error("You are not a member of this group.");
  const asker = getUserById(userId)!;
  postMessage({
    groupId,
    authorUserId: userId,
    authorLabel: asker.name,
    kind: "message",
    content: "Asked the group's agents who's relevant and what they're looking for.",
  });

  for (const member of view.members) {
    if (member.userId === userId) continue;
    const agent = getAgentForUser(member.userId);
    const goal = agent.goals.trim();
    const looking = agent.looking_for.trim();
    const parts: string[] = [];
    if (goal) parts.push(`${member.name} is focused on ${goal.replace(/\.$/, "")}`);
    if (looking) parts.push(`open to ${looking.replace(/\.$/, "")}`);
    const content = parts.length
      ? `${parts.join("; ")}. Happy to explore if it's a fit — ${member.name} approves anything before it's shared.`
      : `${member.name}'s agent is here, but ${member.name} hasn't set goals yet. Nothing to share until they do.`;
    postMessage({
      groupId,
      authorUserId: member.userId,
      authorLabel: `${member.name}'s Agent`,
      kind: "agent",
      content,
    });
  }
}

/** One member's agent replies (rule-based, from its public profile). Used when
 *  a message is directed to that agent with a /name mention. */
export function askGroupMember(userId: string, groupId: string, memberUserId: string) {
  if (!isMember(groupId, userId) || !isMember(groupId, memberUserId)) return;
  const member = getUserById(memberUserId);
  if (!member) return;
  const agent = getAgentForUser(memberUserId);
  const goal = agent.goals.trim();
  const looking = agent.looking_for.trim();
  const parts: string[] = [];
  if (goal) parts.push(`${member.name} is focused on ${goal.replace(/\.$/, "")}`);
  if (looking) parts.push(`open to ${looking.replace(/\.$/, "")}`);
  const content = parts.length
    ? `${parts.join("; ")}. Happy to explore if it's a fit — ${member.name} approves anything before it's shared.`
    : `${member.name}'s agent is here, but ${member.name} hasn't set goals yet — nothing to share until they do.`;
  postMessage({ groupId, authorUserId: memberUserId, authorLabel: `${member.name}'s Agent`, kind: "agent", content });
}

/** Plain-text transcript for the (explicit, LLM) summarize action. */
export function groupTranscript(view: GroupView): string {
  return view.messages
    .filter((m) => m.kind !== "system")
    .map((m) => `${m.author_label}: ${m.content}`)
    .join("\n")
    .slice(0, 4000);
}

export function postGroupSummary(groupId: string, text: string) {
  postMessage({
    groupId,
    authorUserId: null,
    authorLabel: "Your agent",
    kind: "summary",
    content: text,
  });
}
