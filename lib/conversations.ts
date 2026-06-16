import { db } from "./db";
import { listIncoming } from "./core";
import { listIntros, waitingOn } from "./intros";
import { listGroups } from "./groups";
import { INTRO_STATUS } from "@/components/intro-status";

/**
 * One unified, WhatsApp-style conversation list across every surface a person
 * talks through: groups, agent-to-agent introductions, and inbox requests.
 * Rule-based aggregation over existing data — no model calls.
 */
export type ConversationKind = "group" | "intro" | "request";

export type ConversationItem = {
  kind: ConversationKind;
  id: string;
  href: string;
  title: string;
  subtitle: string;
  /** Names used for the avatar(s). */
  avatars: string[];
  time: string;
  /** Needs the viewer's attention (approval/decision/reply). */
  pending: boolean;
};

function groupPending(groupId: string, userId: string): boolean {
  const row = db()
    .prepare(
      `SELECT 1 FROM group_proposals p
       WHERE p.group_id = ? AND p.status = 'pending'
         AND NOT EXISTS (SELECT 1 FROM group_proposal_decisions d WHERE d.proposal_id = p.id AND d.user_id = ?)
       LIMIT 1`
    )
    .get(groupId, userId);
  return Boolean(row);
}

export function listConversations(userId: string): ConversationItem[] {
  const items: ConversationItem[] = [];

  for (const g of listGroups(userId)) {
    const members = (
      db()
        .prepare(
          `SELECT u.name FROM group_members m JOIN users u ON u.id = m.user_id
           WHERE m.group_id = ? AND m.user_id != ? ORDER BY u.name LIMIT 3`
        )
        .all(g.id, userId) as { name: string }[]
    ).map((r) => r.name);
    items.push({
      kind: "group",
      id: g.id,
      href: `/conversations/group/${g.id}`,
      title: g.title,
      subtitle: g.goal || `${g.memberCount} members`,
      avatars: members.length ? members : [g.title],
      time: g.updatedAt || "",
      pending: groupPending(g.id, userId),
    });
  }

  for (const i of listIntros(userId)) {
    const other = i.initiator_user_id === userId ? i.target_name : i.initiator_name;
    items.push({
      kind: "intro",
      id: i.id,
      href: `/conversations/intro/${i.id}`,
      title: other,
      subtitle: INTRO_STATUS[i.status]?.label ?? "Introduction",
      avatars: [other],
      time: i.updated_at,
      pending: waitingOn(i, userId),
    });
  }

  for (const r of listIncoming(userId, false)) {
    items.push({
      kind: "request",
      id: r.id,
      href: `/conversations/request/${r.id}`,
      title: r.from_user_name,
      subtitle: r.message,
      avatars: [r.from_user_name],
      time: r.created_at,
      pending: r.status === "waiting_for_recipient",
    });
  }

  return items.sort((a, b) => (b.time || "").localeCompare(a.time || ""));
}
