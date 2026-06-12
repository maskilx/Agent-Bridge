import type { Agent, User } from "./core";

/**
 * Model adapter layer — used ONLY for drafting, summarizing, classifying, and
 * recommending. The model never executes external actions: everything it
 * produces is a Mission Draft that the owner reviews, and all execution flows
 * through AgentBridge permissions, approvals, and the audit trail.
 *
 * Provider selection (first configured wins, falls back to rules on any error):
 *   ANTHROPIC_API_KEY  → Anthropic Messages API (model: ANTHROPIC_MODEL, default claude-opus-4-8)
 *   OPENAI_API_KEY     → OpenAI Chat Completions (model: OPENAI_MODEL, default gpt-4o-mini)
 *   neither            → deterministic rule-based drafter
 *
 * Raw fetch (no provider SDKs) keeps the adapter symmetric and dependency-free;
 * to add a local/open-source model, add a provider that speaks its API here.
 */

export type DraftCandidate = {
  user_id: string;
  handle: string;
  name: string;
  description: string;
  goals: string;
  looking_for: string;
  tags: string;
};

export type MissionDraftInput = {
  request: string;
  user: Pick<User, "name" | "email">;
  agent: Agent;
  candidates: DraftCandidate[];
};

export type MissionDraftFields = {
  title: string;
  goal: string;
  context: string;
  target_criteria: string;
  allowed_to_share: string;
  must_not_share: string;
  approval_policy: string;
  expected_output: string;
  /** Handles of explicitly named targets found in the request. */
  target_handles: string[];
  /** Handles the drafter recommends contacting (subset of candidates). */
  recommended_handles: string[];
};

export type MissionDraftResult = { fields: MissionDraftFields; source: "anthropic" | "openai" | "rules" };

const DEFAULT_APPROVAL_POLICY =
  "Owner approval is required before contact details are shared, an introduction is made, " +
  "anything is scheduled, or any commitment is given on the owner's behalf.";

/* ---------------- shared prompt ---------------- */

const DRAFT_FIELDS_SPEC = `Respond with a JSON object with exactly these string fields (plus two string-array fields):
- "title": short mission title, max 8 words
- "goal": what the owner wants, one or two sentences
- "context": background a counterpart agent may need, drawn from the request and profile
- "target_criteria": who the agent should look for or contact, as a keyword-rich sentence
- "allowed_to_share": what may be shared FOR THIS MISSION (start from the profile's allowed list; narrow it if the request implies caution)
- "must_not_share": what must NOT be shared for this mission (always include the profile's never-share list; add anything the request forbids)
- "approval_policy": when the owner must approve (default: before sharing contact details, introductions, scheduling, commitments)
- "expected_output": what the agent should bring back to the owner
- "target_handles": array of candidate handles explicitly named in the request (empty if none)
- "recommended_handles": array of up to 3 candidate handles most relevant to this mission (empty if none fit)`;

function buildPrompt(input: MissionDraftInput): { system: string; user: string } {
  const a = input.agent;
  const candidateLines = input.candidates
    .map(
      (c) =>
        `- @${c.handle} (${c.name}): ${c.description} | goals: ${c.goals} | looking for: ${c.looking_for} | tags: ${c.tags}`
    )
    .join("\n");
  return {
    system:
      "You are the mission-drafting component of AgentBridge, a controlled agent-representation system. " +
      "You only DRAFT missions for the owner to review — you take no actions, contact nobody, and share nothing. " +
      "Never widen permissions beyond the owner's profile defaults; when in doubt, be more restrictive. " +
      DRAFT_FIELDS_SPEC,
    user:
      `Owner: ${input.user.name}\n` +
      `Owner profile — description: ${a.description}\n` +
      `Owner profile — goals: ${a.goals}\n` +
      `Owner profile — looking for: ${a.looking_for}\n` +
      `Owner profile — allowed to share (default): ${a.may_share}\n` +
      `Owner profile — never share (default): ${a.must_not_share}\n` +
      `Owner profile — approval required for: ${a.approval_required_for}\n\n` +
      `Known agents the owner's agent can reach:\n${candidateLines || "(none)"}\n\n` +
      `The owner's request to their agent:\n"""${input.request}"""\n\n` +
      `Draft the mission as JSON.`,
  };
}

const DRAFT_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    goal: { type: "string" },
    context: { type: "string" },
    target_criteria: { type: "string" },
    allowed_to_share: { type: "string" },
    must_not_share: { type: "string" },
    approval_policy: { type: "string" },
    expected_output: { type: "string" },
    target_handles: { type: "array", items: { type: "string" } },
    recommended_handles: { type: "array", items: { type: "string" } },
  },
  required: [
    "title",
    "goal",
    "context",
    "target_criteria",
    "allowed_to_share",
    "must_not_share",
    "approval_policy",
    "expected_output",
    "target_handles",
    "recommended_handles",
  ],
  additionalProperties: false,
} as const;

/* ---------------- providers ---------------- */

async function anthropicDraft(input: MissionDraftInput): Promise<MissionDraftFields | null> {
  const { system, user } = buildPrompt(input);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { format: { type: "json_schema", schema: DRAFT_JSON_SCHEMA } },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as {
    stop_reason: string;
    content: { type: string; text?: string }[];
  };
  if (data.stop_reason === "refusal") return null;
  const text = data.content.find((b) => b.type === "text")?.text;
  return text ? (JSON.parse(text) as MissionDraftFields) : null;
}

async function openaiDraft(input: MissionDraftInput): Promise<MissionDraftFields | null> {
  const { system, user } = buildPrompt(input);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { choices: { message: { content: string | null } }[] };
  const text = data.choices?.[0]?.message?.content;
  return text ? (JSON.parse(text) as MissionDraftFields) : null;
}

/* ---------------- rule-based fallback ---------------- */

const INTENT_KEYWORDS: { pattern: RegExp; criteria: string; output: string }[] = [
  {
    pattern: /\b(gtm|go.to.market|sales|marketing|growth|business cofounder|biz dev)\b/i,
    criteria: "go-to-market, sales, marketing, growth, business cofounder, B2B",
    output: "A shortlist of relevant GTM/business people with reports and a recommended next step.",
  },
  {
    pattern: /\b(cofounder|co-founder)\b/i,
    criteria: "cofounder, founder, startup, committed",
    output: "Potential cofounder candidates with match reports and recommended next steps.",
  },
  {
    pattern: /\b(early users?|design partners?|beta|pilots?|customers?)\b/i,
    criteria: "early adopters, design partners, potential users, pilot customers",
    output: "A list of people open to trying the product, with context on why they fit.",
  },
  {
    pattern: /\b(feedback|review|opinion|pricing|advice)\b/i,
    criteria: "experienced operators or experts who can give concrete feedback",
    output: "Candid feedback collected from relevant people, summarized with sources.",
  },
  {
    pattern: /\b(technical|engineer|developer|cto|architect)\b/i,
    criteria: "technical, engineering, developer, product builder",
    output: "Relevant technical people with reports and a recommended next step.",
  },
  {
    pattern: /\b(advisor|mentor|expert)\b/i,
    criteria: "experienced advisor or domain expert",
    output: "Potential advisors with relevance reports and a recommended next step.",
  },
];

/** Phrases like "don't share X", "without mentioning Y" → extra must-not-share items. */
function extractForbidden(request: string): string[] {
  const out: string[] = [];
  const patterns = [
    /(?:don'?t|do not|never|without)\s+(?:shar(?:e|ing)|mention(?:ing)?|reveal(?:ing)?|disclos(?:e|ing))\s+([^.;!?]+)/gi,
  ];
  for (const re of patterns) {
    for (const m of request.matchAll(re)) out.push(m[1].trim());
  }
  return out;
}

function rulesDraft(input: MissionDraftInput): MissionDraftFields {
  const req = input.request.trim();
  const a = input.agent;

  // Named targets: candidate names or @handles appearing in the request.
  const lower = req.toLowerCase();
  const named = input.candidates.filter(
    (c) => lower.includes(`@${c.handle.toLowerCase()}`) || new RegExp(`\\b${c.name.toLowerCase()}\\b`).test(lower)
  );

  const intent = INTENT_KEYWORDS.find((k) => k.pattern.test(req));
  const criteria = named.length
    ? `Specifically: ${named.map((c) => `${c.name} (@${c.handle})`).join(", ")}.`
    : `${intent?.criteria ?? "people relevant to this request"} — based on: ${req}`;

  const forbidden = extractForbidden(req);
  const mustNot = [a.must_not_share.trim(), ...forbidden].filter(Boolean).join(" Also for this mission: ");

  const askFirst = /\b(ask (?:me )?(?:before|first)|check with me|approval before)\b/i.test(req);

  const words = req.replace(/^["']|["']$/g, "").split(/\s+/);
  const title = words.slice(0, 8).join(" ") + (words.length > 8 ? "…" : "");

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    goal: req,
    context: a.description || `Acting on behalf of ${input.user.name}.`,
    target_criteria: criteria,
    allowed_to_share: a.may_share || "Only what is on the public agent profile.",
    must_not_share: mustNot || "Contact details and anything private.",
    approval_policy: askFirst
      ? "Owner approval is required BEFORE contacting anyone, and again before sharing contact details or committing to anything."
      : DEFAULT_APPROVAL_POLICY,
    expected_output: intent?.output ?? "A structured report with findings, risks, and a recommended next step.",
    target_handles: named.map((c) => c.handle),
    recommended_handles: [],
  };
}

/* ---------------- validation + entry point ---------------- */

function sanitize(fields: MissionDraftFields, input: MissionDraftInput): MissionDraftFields {
  const str = (v: unknown, max = 1500) => String(v ?? "").trim().slice(0, max);
  const valid = new Set(input.candidates.map((c) => c.handle));
  const handles = (v: unknown) =>
    Array.isArray(v) ? v.map((h) => String(h).replace(/^@/, "")).filter((h) => valid.has(h)).slice(0, 5) : [];

  // Guardrail: a draft can narrow permissions but never drop the profile's never-share list.
  let mustNot = str(fields.must_not_share);
  const profileMustNot = input.agent.must_not_share.trim();
  if (profileMustNot && !mustNot.toLowerCase().includes(profileMustNot.slice(0, 40).toLowerCase())) {
    mustNot = [profileMustNot, mustNot].filter(Boolean).join(" Additionally: ");
  }

  return {
    title: str(fields.title, 120) || "New mission",
    goal: str(fields.goal) || input.request.trim().slice(0, 1500),
    context: str(fields.context),
    target_criteria: str(fields.target_criteria),
    allowed_to_share: str(fields.allowed_to_share) || input.agent.may_share,
    must_not_share: mustNot,
    approval_policy: str(fields.approval_policy) || DEFAULT_APPROVAL_POLICY,
    expected_output: str(fields.expected_output),
    target_handles: handles(fields.target_handles),
    recommended_handles: handles(fields.recommended_handles),
  };
}

export async function draftMission(input: MissionDraftInput): Promise<MissionDraftResult> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const fields = await anthropicDraft(input);
      if (fields) return { fields: sanitize(fields, input), source: "anthropic" };
    } catch (err) {
      console.error("Anthropic mission draft failed, falling back to rules:", err);
    }
  }
  if (process.env.OPENAI_API_KEY) {
    try {
      const fields = await openaiDraft(input);
      if (fields) return { fields: sanitize(fields, input), source: "openai" };
    } catch (err) {
      console.error("OpenAI mission draft failed, falling back to rules:", err);
    }
  }
  return { fields: sanitize(rulesDraft(input), input), source: "rules" };
}
