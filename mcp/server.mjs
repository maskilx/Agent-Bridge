#!/usr/bin/env node
/**
 * AgentBridge MCP server (private, stdio).
 *
 * A thin client over the AgentBridge HTTP API. The same server binary works for
 * every provider — Codex CLI, Claude Code, Claude Desktop — each user just runs
 * it with their own token:
 *
 *   AGENTBRIDGE_URL=http://localhost:3001 AGENTBRIDGE_TOKEN=ab_demo_... node mcp/server.mjs
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = (process.env.AGENTBRIDGE_URL ?? "http://localhost:3001").replace(/\/$/, "");
const TOKEN = process.env.AGENTBRIDGE_TOKEN;

if (!TOKEN) {
  console.error("AGENTBRIDGE_TOKEN environment variable is required.");
  process.exit(1);
}

/** Which client this MCP server is plugged into (Claude, Codex, …) — used for the audit trail. */
let clientName = process.env.AGENTBRIDGE_CLIENT ?? "";

async function api(method, path, body) {
  if (!clientName) {
    try {
      clientName = server.server.getClientVersion()?.name ?? "";
    } catch {
      /* not initialized yet */
    }
  }
  const res = await fetch(`${BASE_URL}/api/mcp${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "X-AgentBridge-Client": clientName || "MCP client",
      // When the deployment is behind Cloudflare Access, authenticate this
      // non-interactive client with an Access service token.
      ...(process.env.CF_ACCESS_CLIENT_ID
        ? {
            "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID,
            "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET ?? "",
          }
        : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(data.error ?? `AgentBridge API error (HTTP ${res.status})`);
  return data;
}

function asResult(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function asError(err) {
  return {
    content: [{ type: "text", text: `Error: ${err.message}` }],
    isError: true,
  };
}

const server = new McpServer({ name: "agentbridge", version: "0.1.0" });

server.registerTool(
  "search_agents",
  {
    description:
      "Search for people's agents on AgentBridge by name, handle (e.g. @jordan), email, or tags. " +
      "Searches the user's contacts first, then the directory of registered users. " +
      "Use this to find the right recipient before sending a request.",
    inputSchema: { query: z.string().describe("Name, @handle, email, or tag to search for") },
  },
  async ({ query }) => {
    try {
      return asResult(await api("GET", `/agents/search?q=${encodeURIComponent(query)}`));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "send_agent_request",
  {
    description:
      "Send a structured request to another person's agent through AgentBridge. " +
      "AgentBridge routes it to the recipient's agent and applies their approval policy. " +
      "Returns the request_id — keep it to check for a reply later with get_agent_reply.",
    inputSchema: {
      to: z.string().describe("Recipient: @handle, email, or contact name (e.g. '@jordan')"),
      intent: z
        .string()
        .describe(
          "Machine-readable intent, e.g. 'availability_check', 'scheduling', 'question', 'introduction'"
        ),
      message: z.string().describe("The question or request, phrased clearly for the recipient"),
      requires_approval: z
        .boolean()
        .optional()
        .describe("Whether the recipient must approve before a reply is sent (default true)"),
      payload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Optional extra structured fields, e.g. { time_window: 'tomorrow evening' }"),
    },
  },
  async ({ to, intent, message, requires_approval, payload }) => {
    try {
      return asResult(await api("POST", "/requests", { to, intent, message, requires_approval, payload }));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "list_incoming_requests",
  {
    description:
      "List pending requests in the authenticated user's AgentBridge inbox — requests from other " +
      "people's agents that are waiting for this user's reply or approval.",
    inputSchema: {
      include_handled: z
        .boolean()
        .optional()
        .describe("Also include already-answered requests (default false)"),
    },
  },
  async ({ include_handled }) => {
    try {
      return asResult(await api("GET", `/requests?box=incoming&pending=${include_handled ? "0" : "1"}`));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "list_my_requests",
  {
    description: "List the user's recent outgoing and incoming AgentBridge requests with their statuses.",
    inputSchema: {},
  },
  async () => {
    try {
      return asResult(await api("GET", "/requests?box=all"));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "get_request_status",
  {
    description: "Get the current status of an AgentBridge request by request_id.",
    inputSchema: { request_id: z.string().describe("The request id, e.g. 'req_a1b2c3'") },
  },
  async ({ request_id }) => {
    try {
      return asResult(await api("GET", `/requests/${encodeURIComponent(request_id)}`));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "reply_to_request",
  {
    description:
      "Reply to an incoming AgentBridge request on behalf of the user (recipient side). " +
      "Only call this after the user has confirmed what to answer. " +
      "approval_status: 'approved' (user approved this reply), 'edited' (user changed the suggested reply), " +
      "or 'rejected' (user declined to answer; reply_text optional).",
    inputSchema: {
      request_id: z.string().describe("The request id to reply to"),
      reply_text: z.string().describe("The reply, e.g. \"I'm free after 19:00.\""),
      approval_status: z.enum(["approved", "edited", "rejected"]).describe("How the user decided"),
    },
  },
  async ({ request_id, reply_text, approval_status }) => {
    try {
      return asResult(
        await api("POST", `/requests/${encodeURIComponent(request_id)}/reply`, {
          reply_text,
          approval_status,
        })
      );
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "get_agent_reply",
  {
    description:
      "Check whether the recipient has replied to a request you sent. Returns the reply text and " +
      "approval status if available; otherwise the current status (e.g. still waiting for the recipient).",
    inputSchema: { request_id: z.string().describe("The request id returned by send_agent_request") },
  },
  async ({ request_id }) => {
    try {
      return asResult(await api("GET", `/requests/${encodeURIComponent(request_id)}`));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "create_contact",
  {
    description:
      "Add a person to the user's AgentBridge contacts. If their email or handle matches a " +
      "registered user, the contact is linked to their agent automatically.",
    inputSchema: {
      name: z.string().describe("Contact's name"),
      email: z.string().optional().describe("Contact's email"),
      handle: z.string().optional().describe("Contact's AgentBridge handle, e.g. '@jordan'"),
      relationship: z.string().optional().describe("Relationship, e.g. 'colleague', 'friend'"),
    },
  },
  async ({ name, email, handle, relationship }) => {
    try {
      return asResult(await api("POST", "/contacts", { name, email, handle, relationship }));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "start_session",
  {
    description:
      "Open a live coordination session with another person's agent on AgentBridge. " +
      "A session is a stateful room for multi-turn agent-to-agent coordination: messages, " +
      "proposals that need the other owner's approval, and a shared audit timeline. " +
      "Returns the session_id — use it with send_session_message and get_session_events.",
    inputSchema: {
      with: z.string().describe("The other participant: @handle, email, or contact name"),
      topic: z.string().describe("What this session is about, e.g. 'Find a time for a call this week'"),
      message: z.string().optional().describe("Optional opening message"),
    },
  },
  async ({ with: withRef, topic, message }) => {
    try {
      return asResult(await api("POST", "/sessions", { with: withRef, topic, message }));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "list_active_sessions",
  {
    description:
      "List the user's active AgentBridge coordination sessions, including pending approval " +
      "checkpoints and the last_event_id (useful to poll for new events).",
    inputSchema: {
      include_completed: z.boolean().optional().describe("Also include completed sessions (default false)"),
    },
  },
  async ({ include_completed }) => {
    try {
      return asResult(await api("GET", `/sessions${include_completed ? "?all=1" : ""}`));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "get_session_events",
  {
    description:
      "Get the timeline of a session: messages, proposals, approval decisions, and status changes. " +
      "Pass since_event_id to fetch only events newer than what you've already seen (token-efficient polling).",
    inputSchema: {
      session_id: z.string().describe("The session id, e.g. 'ses_a1b2c3'"),
      since_event_id: z.number().optional().describe("Only return events with id greater than this"),
    },
  },
  async ({ session_id, since_event_id }) => {
    try {
      return asResult(
        await api("GET", `/sessions/${encodeURIComponent(session_id)}/events?since=${since_event_id ?? 0}`)
      );
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "send_session_message",
  {
    description:
      "Send a message into an active session on behalf of the user. kind controls the semantics: " +
      "'update' (plain message), 'proposal' (a concrete proposal that becomes a pending approval " +
      "checkpoint for the other owner), 'approve' or 'reject' (decide the other side's latest pending " +
      "proposal; message becomes an optional note). Only send proposals/decisions the user has confirmed.",
    inputSchema: {
      session_id: z.string().describe("The session id"),
      message: z.string().describe("The message text (optional note when kind is approve/reject)"),
      kind: z
        .enum(["update", "proposal", "approve", "reject"])
        .optional()
        .describe("Message semantics (default 'update')"),
      approver: z
        .enum(["peer", "self"])
        .optional()
        .describe(
          "For proposals: who must sign off. 'peer' (default) = the other participant's owner. " +
            "'self' = this agent's own owner — use when the user's own human must approve what " +
            "the agent is about to share (e.g. releasing a technical summary)."
        ),
    },
  },
  async ({ session_id, message, kind, approver }) => {
    try {
      return asResult(
        await api("POST", `/sessions/${encodeURIComponent(session_id)}/messages`, {
          message,
          kind,
          approver,
        })
      );
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "list_pending_approvals",
  {
    description:
      "List approval checkpoints waiting on the authenticated user — things their agent (or a " +
      "counterpart's agent) wants to share or commit to, held until this human decides. " +
      "Check this when the user asks 'anything waiting for me?'.",
    inputSchema: {},
  },
  async () => {
    try {
      return asResult(await api("GET", "/approvals"));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "get_approval_checkpoint",
  {
    description: "Get one approval checkpoint by id, with its full text and session context.",
    inputSchema: { checkpoint_id: z.number().describe("The checkpoint id") },
  },
  async ({ checkpoint_id }) => {
    try {
      return asResult(await api("GET", `/approvals/${checkpoint_id}`));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "approve_checkpoint",
  {
    description:
      "Approve a pending checkpoint on behalf of the user. Only call this after the user has " +
      "explicitly said to approve. The decision is recorded on the audit trail with this client's name.",
    inputSchema: {
      checkpoint_id: z.number().describe("The checkpoint id"),
      note: z.string().optional().describe("Optional note from the owner"),
    },
  },
  async ({ checkpoint_id, note }) => {
    try {
      return asResult(
        await api("POST", `/approvals/${checkpoint_id}/decide`, { decision: "approved", note })
      );
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "reject_checkpoint",
  {
    description:
      "Reject a pending checkpoint on behalf of the user. Only call this after the user has " +
      "explicitly said to reject. Recorded on the audit trail with this client's name.",
    inputSchema: {
      checkpoint_id: z.number().describe("The checkpoint id"),
      note: z.string().optional().describe("Optional reason from the owner"),
    },
  },
  async ({ checkpoint_id, note }) => {
    try {
      return asResult(
        await api("POST", `/approvals/${checkpoint_id}/decide`, { decision: "rejected", note })
      );
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "edit_and_approve_checkpoint",
  {
    description:
      "Approve a pending checkpoint with edited text — the owner's final wording replaces the " +
      "agent's draft, and the edit is recorded on the audit trail. Use when the user says " +
      "'edit it to say …' or rewrites the wording.",
    inputSchema: {
      checkpoint_id: z.number().describe("The checkpoint id"),
      edited_text: z.string().describe("The owner's final wording"),
      note: z.string().optional().describe("Optional note from the owner"),
    },
  },
  async ({ checkpoint_id, edited_text, note }) => {
    try {
      return asResult(
        await api("POST", `/approvals/${checkpoint_id}/decide`, {
          decision: "approved",
          edited_text,
          note,
        })
      );
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "complete_session",
  {
    description:
      "Mark a session as completed, optionally with an outcome summary that both sides will see " +
      "on the audit timeline.",
    inputSchema: {
      session_id: z.string().describe("The session id"),
      summary: z.string().optional().describe("Outcome summary, e.g. 'Agreed on Thursday 19:30 call'"),
    },
  },
  async ({ session_id, summary }) => {
    try {
      return asResult(await api("POST", `/sessions/${encodeURIComponent(session_id)}/complete`, { summary }));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "list_matches",
  {
    description:
      "List people whose agent profiles look relevant to what this user is looking for " +
      "(cofounder / collaboration matching). Returns a 0-100 match score and the overlapping " +
      "criteria in both directions. Use before request_introduction.",
    inputSchema: {},
  },
  async () => {
    try {
      return asResult(await api("GET", `/matches`));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "request_introduction",
  {
    description:
      "Have this user's agent reach out to another person's agent for a structured introduction. " +
      "The two agents hold a limited exchange (only pre-approved information is shared), the other " +
      "agent checks relevance against its owner's criteria, and both owners get a structured report. " +
      "Contact details are exchanged only after BOTH owners approve their checkpoints " +
      "(see list_pending_approvals / approve_checkpoint).",
    inputSchema: {
      to: z.string().describe("Target person: @handle, email, or contact name"),
      mission_id: z
        .string()
        .optional()
        .describe(
          "Optional: run this outreach under an APPROVED mission — its mission-specific share rules and goal apply"
        ),
    },
  },
  async ({ to, mission_id }) => {
    try {
      return asResult(await api("POST", `/intros`, { to, mission_id }));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "list_introductions",
  {
    description:
      "List this user's agent-to-agent introductions with their status, match score, the structured " +
      "report (summary, match reasons, risks, missing info, recommendation), and — when an intro is " +
      "waiting on this user — the checkpoint_id to decide with approve_checkpoint / reject_checkpoint.",
    inputSchema: {},
  },
  async () => {
    try {
      return asResult(await api("GET", `/intros`));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "create_mission_draft",
  {
    description:
      "Turn the owner's natural-language request (e.g. 'find me a GTM cofounder', 'ask Noa if she is " +
      "open to an intro but don't share product details') into a Mission Draft: a scoped, temporary " +
      "mandate with its own goal, target criteria, mission-specific share rules, approval policy, and a " +
      "safe outreach_message — the ONLY text other agents will ever receive (internal boundaries are " +
      "never sent). May instead return a `clarify` question if the request is ambiguous: ask the owner, " +
      "then call again with history. The draft takes NO external action — review it with the owner, " +
      "then approve_mission (with the owner's chosen targets) or cancel_mission.",
    inputSchema: {
      request: z.string().describe("The owner's request to their agent, in natural language"),
      history: z
        .array(z.object({ question: z.string(), answer: z.string() }))
        .optional()
        .describe("Earlier clarify Q&A from this conversation, oldest first"),
    },
  },
  async ({ request, history }) => {
    try {
      return asResult(await api("POST", `/missions`, { request, history }));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "list_missions",
  {
    description:
      "List the owner's missions with status, mission-specific share rules, linked introductions, and " +
      "result summaries. Statuses: awaiting_user_approval (review the draft with the owner), running, " +
      "waiting_for_external_agent, waiting_for_user (an intro checkpoint needs the owner), completed, " +
      "cancelled, rejected.",
    inputSchema: {},
  },
  async () => {
    try {
      return asResult(await api("GET", `/missions`));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "get_mission",
  {
    description: "Get one mission with its full draft fields, linked introductions, and result summary.",
    inputSchema: { mission_id: z.string().describe("The mission id, e.g. 'mis_a1b2c3'") },
  },
  async ({ mission_id }) => {
    try {
      return asResult(await api("GET", `/missions/${encodeURIComponent(mission_id)}`));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "list_mission_matches",
  {
    description:
      "Rank candidate agents for a specific mission (named targets pinned first), with a match score, " +
      "why each fits the mission, and caveats. Use before approve_mission to pick targets with the owner.",
    inputSchema: { mission_id: z.string().describe("The mission id") },
  },
  async ({ mission_id }) => {
    try {
      return asResult(await api("GET", `/missions/${encodeURIComponent(mission_id)}/matches`));
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "approve_mission",
  {
    description:
      "Approve a mission draft ON THE OWNER'S EXPLICIT INSTRUCTION and launch outreach to the given " +
      "targets (max 5). Each outreach runs through the standard introduction flow: mission-specific " +
      "share rules, relevance check by the counterpart agent, structured reports, and approval " +
      "checkpoints before any contact details are exchanged. Only call this after the owner has " +
      "reviewed the draft and named the targets.",
    inputSchema: {
      mission_id: z.string().describe("The mission id"),
      targets: z
        .array(z.string())
        .describe("Targets to contact: @handles from list_mission_matches (owner-approved)"),
    },
  },
  async ({ mission_id, targets }) => {
    try {
      return asResult(
        await api("POST", `/missions/${encodeURIComponent(mission_id)}/decide`, {
          decision: "approved",
          targets,
        })
      );
    } catch (err) {
      return asError(err);
    }
  }
);

server.registerTool(
  "cancel_mission",
  {
    description: "Reject a mission draft or cancel an active mission. No further outreach will happen for it.",
    inputSchema: { mission_id: z.string().describe("The mission id") },
  },
  async ({ mission_id }) => {
    try {
      return asResult(
        await api("POST", `/missions/${encodeURIComponent(mission_id)}/decide`, { decision: "cancelled" })
      );
    } catch (err) {
      return asError(err);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`AgentBridge MCP server connected (${BASE_URL})`);
