import { db, newId } from "./db";

export type User = {
  id: string;
  name: string;
  email: string;
  handle: string;
  api_token: string;
  google_sub: string | null;
  picture: string;
  onboarded: number;
  created_at: string;
};

export type Agent = {
  id: string;
  user_id: string;
  display_name: string;
  description: string;
  provider: string;
  visibility: "private" | "invite-only" | "searchable";
  tags: string;
  auto_reply_text: string;
  rules: string;
  goals: string;
  responsibilities: string;
  looking_for: string;
  may_share: string;
  must_not_share: string;
  approval_required_for: string;
  created_at: string;
};

export type AgentRequest = {
  id: string;
  from_user_id: string;
  from_agent_id: string;
  to_user_id: string;
  to_agent_id: string;
  intent: string;
  message: string;
  payload: string;
  status: string;
  requires_approval: number;
  created_at: string;
  updated_at: string;
};

export type AgentResponse = {
  id: string;
  request_id: string;
  responder_user_id: string;
  response_text: string;
  approval_status: "approved" | "edited" | "rejected";
  auto: number;
  created_at: string;
};

export type AuditEvent = {
  id: string;
  request_id: string;
  actor_label: string;
  type: string;
  detail: string;
  created_at: string;
};

export type RequestView = AgentRequest & {
  from_user_name: string;
  from_agent_name: string;
  from_agent_provider: string;
  to_user_name: string;
  to_agent_name: string;
  to_agent_provider: string;
  response?: AgentResponse | null;
};

// ---------- users / agents ----------

export function getUserByToken(token: string): User | undefined {
  return db().prepare("SELECT * FROM users WHERE api_token = ?").get(token) as User | undefined;
}

export function getUserById(id: string): User | undefined {
  return db().prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
}

export function getAgentForUser(userId: string): Agent {
  return db().prepare("SELECT * FROM agents WHERE user_id = ?").get(userId) as Agent;
}

export function listUsers(): User[] {
  return db().prepare("SELECT * FROM users ORDER BY created_at").all() as User[];
}

export function getUserByGoogleSub(sub: string): User | undefined {
  return db().prepare("SELECT * FROM users WHERE google_sub = ?").get(sub) as User | undefined;
}

export function getUserByEmail(email: string): User | undefined {
  return db().prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase()) as
    | User
    | undefined;
}

/** Create a user (Google sign-in or dev sign-in) with an empty agent ready for setup. */
export function createUser(opts: {
  name: string;
  email: string;
  googleSub?: string;
  picture?: string;
}): User {
  const d = db();
  const base =
    opts.email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 24) || "user";
  let handle = base;
  for (let n = 2; d.prepare("SELECT 1 FROM users WHERE handle = ?").get(handle); n++) {
    handle = `${base}${n}`;
  }

  const id = newId("usr");
  d.prepare(
    `INSERT INTO users (id, name, email, handle, api_token, google_sub, picture, onboarded)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(
    id,
    opts.name.trim() || handle,
    opts.email.trim().toLowerCase(),
    handle,
    `ab_${newId("key").slice(4)}_${Date.now().toString(36)}`,
    opts.googleSub ?? null,
    opts.picture ?? ""
  );
  d.prepare(
    `INSERT INTO agents (id, user_id, display_name, description, provider, visibility, rules)
     VALUES (?, ?, ?, '', 'AgentBridge', 'searchable', ?)`
  ).run(newId("agt"), id, `${opts.name.trim() || handle}'s Agent`, JSON.stringify({ "*": "require_approval" }));
  return getUserById(id)!;
}

export function linkGoogleAccount(userId: string, googleSub: string, picture: string) {
  db()
    .prepare("UPDATE users SET google_sub = ?, picture = ? WHERE id = ?")
    .run(googleSub, picture, userId);
}

export function markOnboarded(userId: string) {
  db().prepare("UPDATE users SET onboarded = 1 WHERE id = ?").run(userId);
}

export function updateAgent(
  userId: string,
  fields: {
    display_name: string;
    description: string;
    visibility: string;
    tags: string;
    auto_reply_text: string;
    rules: string;
    goals: string;
    responsibilities: string;
    looking_for: string;
    may_share: string;
    must_not_share: string;
    approval_required_for: string;
  }
) {
  db()
    .prepare(
      `UPDATE agents SET display_name = ?, description = ?, visibility = ?, tags = ?, auto_reply_text = ?, rules = ?,
              goals = ?, responsibilities = ?, looking_for = ?, may_share = ?, must_not_share = ?, approval_required_for = ?
       WHERE user_id = ?`
    )
    .run(
      fields.display_name,
      fields.description,
      fields.visibility,
      fields.tags,
      fields.auto_reply_text,
      fields.rules,
      fields.goals,
      fields.responsibilities,
      fields.looking_for,
      fields.may_share,
      fields.must_not_share,
      fields.approval_required_for,
      userId
    );
}

// ---------- discovery ----------

export type AgentMatch = {
  user_id: string;
  name: string;
  handle: string;
  email: string;
  agent_name: string;
  provider: string;
  description: string;
  tags: string;
  source: "contact" | "directory";
};

export function searchAgents(viewerUserId: string, query: string): AgentMatch[] {
  const q = `%${query.trim().replace(/^@/, "")}%`;
  const matches: AgentMatch[] = [];
  const seen = new Set<string>();

  // 1. The viewer's own contacts (linked to registered users).
  const contactRows = db()
    .prepare(
      `SELECT u.id AS user_id, u.name, u.handle, u.email,
              a.display_name AS agent_name, a.provider, a.description, a.tags
       FROM contacts c
       JOIN users u ON u.id = c.linked_user_id
       JOIN agents a ON a.user_id = u.id
       WHERE c.owner_user_id = ?
         AND (c.name LIKE ? OR c.handle LIKE ? OR c.email LIKE ? OR u.name LIKE ? OR u.handle LIKE ?)`
    )
    .all(viewerUserId, q, q, q, q, q) as Omit<AgentMatch, "source">[];
  for (const r of contactRows) {
    seen.add(r.user_id);
    matches.push({ ...r, source: "contact" });
  }

  // 2. Registered users whose agent is searchable.
  const directoryRows = db()
    .prepare(
      `SELECT u.id AS user_id, u.name, u.handle, u.email,
              a.display_name AS agent_name, a.provider, a.description, a.tags
       FROM users u
       JOIN agents a ON a.user_id = u.id
       WHERE a.visibility = 'searchable' AND u.id != ?
         AND (u.name LIKE ? OR u.handle LIKE ? OR u.email LIKE ? OR a.tags LIKE ? OR a.display_name LIKE ?)`
    )
    .all(viewerUserId, q, q, q, q, q) as Omit<AgentMatch, "source">[];
  for (const r of directoryRows) {
    if (seen.has(r.user_id)) continue;
    seen.add(r.user_id);
    matches.push({ ...r, source: "directory" });
  }

  return matches;
}

export function resolveRecipient(viewerUserId: string, to: string): User | undefined {
  const d = db();
  const cleaned = to.trim().replace(/^@/, "");

  const byHandleOrEmail = d
    .prepare("SELECT * FROM users WHERE handle = ? OR email = ? OR id = ?")
    .get(cleaned, to.trim(), to.trim()) as User | undefined;
  if (byHandleOrEmail) return byHandleOrEmail;

  const byContact = d
    .prepare(
      `SELECT u.* FROM contacts c JOIN users u ON u.id = c.linked_user_id
       WHERE c.owner_user_id = ? AND (c.name LIKE ? OR c.handle = ?) AND c.linked_user_id IS NOT NULL`
    )
    .get(viewerUserId, `%${cleaned}%`, cleaned) as User | undefined;
  return byContact;
}

// ---------- requests + built-in agent policy ----------

function addEvent(requestId: string, actorLabel: string, type: string, detail = "") {
  db()
    .prepare("INSERT INTO events (id, request_id, actor_label, type, detail) VALUES (?, ?, ?, ?, ?)")
    .run(newId("evt"), requestId, actorLabel, type, detail);
}

function setStatus(requestId: string, status: string) {
  db()
    .prepare("UPDATE requests SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, requestId);
}

export function sendRequest(opts: {
  fromUserId: string;
  to: string;
  intent: string;
  message: string;
  payload?: Record<string, unknown>;
  requiresApproval?: boolean;
}): { request: RequestView } {
  const fromUser = getUserById(opts.fromUserId)!;
  const fromAgent = getAgentForUser(fromUser.id);
  const toUser = resolveRecipient(opts.fromUserId, opts.to);
  if (!toUser) {
    throw new Error(
      `No registered agent found for "${opts.to}". Search your contacts with search_agents, or invite them to AgentBridge.`
    );
  }
  if (toUser.id === fromUser.id) throw new Error("You cannot send a request to your own agent.");
  const toAgent = getAgentForUser(toUser.id);

  const id = newId("req");
  const payload = {
    intent: opts.intent,
    from: fromAgent.display_name,
    to: toAgent.display_name,
    question: opts.message,
    ...(opts.payload ?? {}),
  };

  db()
    .prepare(
      `INSERT INTO requests (id, from_user_id, from_agent_id, to_user_id, to_agent_id, intent, message, payload, status, requires_approval)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(
      id,
      fromUser.id,
      fromAgent.id,
      toUser.id,
      toAgent.id,
      opts.intent,
      opts.message,
      JSON.stringify(payload),
      opts.requiresApproval === false ? 0 : 1
    );
  addEvent(id, fromAgent.display_name, "request_created", `Sent via ${fromAgent.provider}`);
  addEvent(id, "AgentBridge", "routed", `Routed to ${toAgent.display_name} (${toAgent.provider})`);

  // Built-in agent: apply the recipient's policy rules.
  const rules = JSON.parse(toAgent.rules || "{}") as Record<string, string>;
  const action = rules[opts.intent] ?? rules["*"] ?? "require_approval";

  if (action === "block") {
    setStatus(id, "rejected");
    addEvent(id, toAgent.display_name, "policy_blocked", `Policy blocks intent "${opts.intent}"`);
  } else if (action === "auto_reply" && toAgent.auto_reply_text.trim()) {
    db()
      .prepare(
        `INSERT INTO responses (id, request_id, responder_user_id, response_text, approval_status, auto)
         VALUES (?, ?, ?, ?, 'approved', 1)`
      )
      .run(newId("res"), id, toUser.id, toAgent.auto_reply_text.trim());
    setStatus(id, "approved");
    addEvent(id, toAgent.display_name, "auto_replied", "Replied automatically per agent policy (no approval required)");
  } else {
    setStatus(id, "waiting_for_recipient");
    addEvent(
      id,
      toAgent.display_name,
      "approval_required",
      `Policy for intent "${opts.intent}" requires ${toUser.name}'s approval. Added to inbox.`
    );
  }

  return { request: getRequestView(id)! };
}

const VIEW_SELECT = `
  SELECT r.*,
         fu.name AS from_user_name, fa.display_name AS from_agent_name, fa.provider AS from_agent_provider,
         tu.name AS to_user_name, ta.display_name AS to_agent_name, ta.provider AS to_agent_provider
  FROM requests r
  JOIN users fu ON fu.id = r.from_user_id
  JOIN agents fa ON fa.id = r.from_agent_id
  JOIN users tu ON tu.id = r.to_user_id
  JOIN agents ta ON ta.id = r.to_agent_id
`;

function attachResponse(r: RequestView): RequestView {
  const response = db()
    .prepare("SELECT * FROM responses WHERE request_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(r.id) as AgentResponse | undefined;
  r.response = response ?? null;
  return r;
}

export function getRequestView(id: string): RequestView | undefined {
  const row = db().prepare(`${VIEW_SELECT} WHERE r.id = ?`).get(id) as RequestView | undefined;
  return row ? attachResponse(row) : undefined;
}

export function listIncoming(userId: string, onlyPending = false): RequestView[] {
  const where = onlyPending
    ? "WHERE r.to_user_id = ? AND r.status = 'waiting_for_recipient'"
    : "WHERE r.to_user_id = ?";
  const rows = db()
    .prepare(`${VIEW_SELECT} ${where} ORDER BY r.created_at DESC`)
    .all(userId) as RequestView[];
  return rows.map(attachResponse);
}

export function listOutgoing(userId: string): RequestView[] {
  const rows = db()
    .prepare(`${VIEW_SELECT} WHERE r.from_user_id = ? ORDER BY r.created_at DESC`)
    .all(userId) as RequestView[];
  return rows.map(attachResponse);
}

export function replyToRequest(opts: {
  responderUserId: string;
  requestId: string;
  replyText: string;
  approvalStatus: "approved" | "edited" | "rejected";
}): RequestView {
  const req = getRequestView(opts.requestId);
  if (!req) throw new Error(`Request ${opts.requestId} not found.`);
  if (req.to_user_id !== opts.responderUserId)
    throw new Error("Only the recipient of this request can reply to it.");
  if (["approved", "edited", "rejected", "completed"].includes(req.status))
    throw new Error(`Request ${opts.requestId} was already answered (status: ${req.status}).`);
  if (opts.approvalStatus !== "rejected" && !opts.replyText.trim())
    throw new Error("Reply text is required when approving or editing.");

  const responder = getUserById(opts.responderUserId)!;
  const agent = getAgentForUser(responder.id);
  db()
    .prepare(
      `INSERT INTO responses (id, request_id, responder_user_id, response_text, approval_status, auto)
       VALUES (?, ?, ?, ?, ?, 0)`
    )
    .run(newId("res"), req.id, responder.id, opts.replyText.trim(), opts.approvalStatus);
  setStatus(req.id, opts.approvalStatus);

  const verb =
    opts.approvalStatus === "approved"
      ? "approved and sent a reply"
      : opts.approvalStatus === "edited"
        ? "sent an edited reply"
        : "rejected the request";
  addEvent(req.id, agent.display_name, opts.approvalStatus, `${responder.name} ${verb} via ${agent.provider}`);

  return getRequestView(req.id)!;
}

export function getReply(viewerUserId: string, requestId: string): RequestView {
  const req = getRequestView(requestId);
  if (!req) throw new Error(`Request ${requestId} not found.`);
  if (req.from_user_id !== viewerUserId && req.to_user_id !== viewerUserId)
    throw new Error("You are not a participant in this request.");

  // Mark delivered once the requester retrieves a decided reply.
  if (req.response && req.from_user_id === viewerUserId && req.status !== "completed" && req.status !== "rejected") {
    setStatus(req.id, "completed");
    addEvent(req.id, "AgentBridge", "reply_delivered", `Reply delivered back to ${req.from_agent_name}`);
    return getRequestView(req.id)!;
  }
  return req;
}

export function getEventsForRequest(requestId: string): AuditEvent[] {
  return db()
    .prepare("SELECT * FROM events WHERE request_id = ? ORDER BY created_at, id")
    .all(requestId) as AuditEvent[];
}

export function recentActivity(userId: string, limit = 12): (AuditEvent & { intent: string })[] {
  return db()
    .prepare(
      `SELECT e.*, r.intent FROM events e
       JOIN requests r ON r.id = e.request_id
       WHERE r.from_user_id = ? OR r.to_user_id = ?
       ORDER BY e.created_at DESC, e.id DESC LIMIT ?`
    )
    .all(userId, userId, limit) as (AuditEvent & { intent: string })[];
}

// ---------- contacts ----------

export type Contact = {
  id: string;
  owner_user_id: string;
  name: string;
  email: string;
  handle: string;
  linked_user_id: string | null;
  relationship: string;
  created_at: string;
};

export function listContacts(userId: string): Contact[] {
  return db()
    .prepare("SELECT * FROM contacts WHERE owner_user_id = ? ORDER BY name")
    .all(userId) as Contact[];
}

export function createContact(opts: {
  ownerUserId: string;
  name: string;
  email?: string;
  handle?: string;
  relationship?: string;
}): Contact {
  const handle = (opts.handle ?? "").trim().replace(/^@/, "");
  const email = (opts.email ?? "").trim();
  const linked = db()
    .prepare("SELECT id FROM users WHERE (handle = ? AND ? != '') OR (email = ? AND ? != '')")
    .get(handle, handle, email, email) as { id: string } | undefined;

  const id = newId("con");
  db()
    .prepare(
      `INSERT INTO contacts (id, owner_user_id, name, email, handle, linked_user_id, relationship)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, opts.ownerUserId, opts.name.trim(), email, handle, linked?.id ?? null, opts.relationship ?? "");
  return db().prepare("SELECT * FROM contacts WHERE id = ?").get(id) as Contact;
}
