import { userFromBearer } from "./auth";
import type { RequestView, User } from "./core";
import type { Checkpoint, SessionEvent, SessionView } from "./sessions";
import { namedUsers, type MissionView } from "./missions";

/** Where an MCP/API call came from, e.g. "Anthropic · Claude" — set by the MCP server. */
export function clientVia(request: Request): string {
  const raw = (request.headers.get("x-agentbridge-client") ?? "").trim();
  if (!raw) return "MCP client";
  if (/claude|anthropic/i.test(raw)) return "Anthropic · Claude";
  if (/codex|openai|chatgpt/i.test(raw)) return "OpenAI · Codex";
  return raw.slice(0, 40);
}

export function authenticate(request: Request): User | Response {
  const user = userFromBearer(request);
  if (!user) {
    return Response.json(
      { error: "Unauthorized. Pass your AgentBridge token as 'Authorization: Bearer <token>'." },
      { status: 401 }
    );
  }
  return user;
}

export function jsonError(err: unknown, status = 400): Response {
  const message = err instanceof Error ? err.message : String(err);
  return Response.json({ error: message }, { status });
}

/** Compact, token-efficient shape for agent (MCP) consumers. */
export function serializeRequest(r: RequestView) {
  return {
    request_id: r.id,
    intent: r.intent,
    message: r.message,
    from: { user: r.from_user_name, agent: r.from_agent_name, provider: r.from_agent_provider },
    to: { user: r.to_user_name, agent: r.to_agent_name, provider: r.to_agent_provider },
    status: r.status,
    requires_recipient_approval: r.requires_approval === 1,
    created_at: r.created_at,
    updated_at: r.updated_at,
    reply: r.response
      ? {
          text: r.response.response_text,
          approval_status: r.response.approval_status,
          approved_by_owner: r.response.auto === 0,
          replied_at: r.response.created_at,
        }
      : null,
  };
}

export function serializeSession(s: SessionView) {
  return {
    session_id: s.id,
    topic: s.topic,
    status: s.status,
    started_by: { user: s.created_by_name, agent: s.created_by_agent, provider: s.created_by_provider },
    with: { user: s.peer_name, agent: s.peer_agent, provider: s.peer_provider },
    summary: s.summary || null,
    pending_checkpoints: s.pending_checkpoints,
    last_event_id: s.last_event_id,
    created_at: s.created_at,
    updated_at: s.updated_at,
  };
}

export function serializeSessionEvent(e: SessionEvent) {
  return {
    event_id: e.id,
    type: e.type,
    kind: e.kind || undefined,
    from: e.actor_label,
    content: e.content,
    approval_status: e.approval_status ?? undefined,
    decided_via: e.decided_via ?? undefined,
    at: e.created_at,
  };
}

export function serializeCheckpoint(c: Checkpoint) {
  return {
    checkpoint_id: c.id,
    session_id: c.session_id,
    session_topic: c.topic,
    requested_by: c.actor_label,
    text: c.content,
    status: c.approval_status,
    decided_via: c.decided_via ?? undefined,
    created_at: c.created_at,
  };
}

/** Compact mission shape for agent (MCP) consumers. */
export function serializeMission(m: MissionView) {
  return {
    mission_id: m.id,
    title: m.title,
    status: m.status,
    user_request: m.user_request,
    goal: m.goal,
    context: m.context,
    target_criteria: m.target_criteria,
    named_targets: namedUsers(m.target_agent_ids).map((u) => `@${u.handle}`),
    recommended_targets: namedUsers(m.recommended_agent_ids).map((u) => `@${u.handle}`),
    allowed_to_share: m.allowed_to_share,
    must_not_share: m.must_not_share,
    approval_policy: m.approval_policy,
    expected_output: m.expected_output,
    draft_source: m.draft_source,
    result_summary: m.result_summary,
    intros: m.intros.map((i) => ({
      intro_id: i.id,
      with: `${i.target_name} (@${i.target_handle})`,
      status: i.status,
      match_score: i.match_score,
    })),
    updated_at: m.updated_at,
  };
}
