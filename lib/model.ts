import type { Agent, User } from "./core";

/**
 * Model adapter layer — used ONLY for interpreting requests, asking clarifying
 * questions, drafting missions, and writing the safe outreach preview. The
 * model never executes external actions: everything it produces is reviewed by
 * the owner, and all execution flows through AgentBridge permissions,
 * approvals, and the audit trail.
 *
 * PRIVACY INVARIANT (enforced here and in lib/intros.ts): internal policy —
 * the user's request, boundaries, must-not-share list, approval rules — never
 * leaves AgentBridge. The only text another agent ever receives is the
 * `outreach_message`, which the owner sees and approves verbatim. The outreach
 * message must never mention what is being withheld: "don't share product
 * details" must NOT become "I can't share product details" — it becomes a
 * message that simply doesn't contain product details.
 *
 * Provider selection (first configured wins, falls back to rules on any error):
 *   ANTHROPIC_API_KEY  → Anthropic Messages API (ANTHROPIC_MODEL, default claude-opus-4-8)
 *   OPENAI_API_KEY     → OpenAI Chat Completions (OPENAI_MODEL, default gpt-4o-mini)
 *   neither            → deterministic rule-based fallback (no paid calls, ever)
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

export type InterpretInput = {
  request: string;
  /** Prior clarifying Q&A in this conversation, oldest first. */
  history: { question: string; answer: string }[];
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
  /** The safe external message — the ONLY text another agent will receive. */
  outreach_message: string;
  target_handles: string[];
  recommended_handles: string[];
};

export type InterpretResult =
  | { kind: "clarify"; reply: string; question: string; source: "anthropic" | "openai" | "rules" }
  | { kind: "draft"; reply: string; fields: MissionDraftFields; source: "anthropic" | "openai" | "rules" };

const DEFAULT_APPROVAL_POLICY =
  "Owner approval is required before contact details are shared, an introduction is made, " +
  "anything is scheduled, or any commitment is given on the owner's behalf.";

/* ---------------- shared prompt ---------------- */

const RESPONSE_SPEC = `Respond with ONE JSON object, either:

A) If the request is too ambiguous to act on safely (unclear intent, unclear target, or unclear what may be shared), ask ONE short clarifying question:
{"kind":"clarify","reply":"<one friendly sentence acknowledging the request>","question":"<one specific question, optionally offering 2-3 options>"}

B) Otherwise draft the mission:
{"kind":"draft","reply":"<one or two friendly sentences: what you understood and what you'll keep private — written to the owner>","fields":{
 "title":"<max 8 words>",
 "goal":"<what the owner wants, 1-2 sentences>",
 "context":"<internal background notes for the owner — NOT sent externally>",
 "target_criteria":"<who to look for/contact, keyword-rich>",
 "allowed_to_share":"<what MAY be shared for this mission, starting from the profile defaults, narrowed by the request>",
 "must_not_share":"<INTERNAL list: profile never-share list plus anything the request forbids — never sent externally>",
 "approval_policy":"<when the owner must approve>",
 "expected_output":"<what the agent should bring back>",
 "outreach_message":"<the EXACT message another agent will receive — see rules below>",
 "target_handles":["<candidate handles explicitly named in the request>"],
 "recommended_handles":["<up to 3 most relevant candidate handles>"]
}}

OUTREACH MESSAGE RULES (critical):
- Write 2-4 short sentences, warm and professional, in the agent's voice: "Hi — I represent <owner>. ..."
- Include ONLY information from "allowed_to_share" that helps the other side judge relevance.
- NEVER mention, hint at, or enumerate what is private or withheld. Forbidden patterns: "I can't share...", "without approval...", "details are confidential...". The message simply omits private topics.
- No contact details, no commitments, no scheduling promises.
- End with a soft mutual-relevance question, e.g. "Would <name> be open to a short intro to see if there's mutual relevance?"`;

function buildPrompt(input: InterpretInput): { system: string; user: string } {
  const a = input.agent;
  const candidateLines = input.candidates
    .map(
      (c) =>
        `- @${c.handle} (${c.name}): ${c.description} | goals: ${c.goals} | looking for: ${c.looking_for} | tags: ${c.tags}`
    )
    .join("\n");
  const qa = input.history
    .map((h) => `Agent asked: "${h.question}"\nOwner answered: "${h.answer}"`)
    .join("\n");
  return {
    system:
      "You are the planning component of AgentBridge, a controlled agent-representation system. " +
      "You DRAFT missions and outreach messages for the owner to review — you take no actions, contact nobody, and share nothing yourself. " +
      "Never widen permissions beyond the owner's profile defaults; when in doubt, be more restrictive. " +
      "Ask at most ONE clarifying question per turn, and only when genuinely needed (don't interrogate). " +
      "If clarifying Q&A is already present, prefer drafting. " +
      RESPONSE_SPEC,
    user:
      `Owner: ${input.user.name}\n` +
      `Owner profile — description: ${a.description}\n` +
      `Owner profile — goals: ${a.goals}\n` +
      `Owner profile — looking for: ${a.looking_for}\n` +
      `Owner profile — allowed to share (default): ${a.may_share}\n` +
      `Owner profile — never share (default, INTERNAL): ${a.must_not_share}\n` +
      `Owner profile — approval required for: ${a.approval_required_for}\n\n` +
      `Known agents the owner's agent can reach:\n${candidateLines || "(none)"}\n\n` +
      (qa ? `Earlier in this conversation:\n${qa}\n\n` : "") +
      `The owner's request to their agent:\n"""${input.request}"""\n\n` +
      `Respond as specified.`,
  };
}

const INTERPRET_JSON_SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["clarify", "draft"] },
    reply: { type: "string" },
    question: { type: "string" },
    fields: {
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
        outreach_message: { type: "string" },
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
        "outreach_message",
        "target_handles",
        "recommended_handles",
      ],
      additionalProperties: false,
    },
  },
  required: ["kind", "reply"],
  additionalProperties: false,
} as const;

type RawInterpretation = {
  kind: "clarify" | "draft";
  reply: string;
  question?: string;
  fields?: MissionDraftFields;
};

/* ---------------- providers ---------------- */

async function anthropicInterpret(input: InterpretInput): Promise<RawInterpretation | null> {
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
      output_config: { format: { type: "json_schema", schema: INTERPRET_JSON_SCHEMA } },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { stop_reason: string; content: { type: string; text?: string }[] };
  if (data.stop_reason === "refusal") return null;
  const text = data.content.find((b) => b.type === "text")?.text;
  return text ? (JSON.parse(text) as RawInterpretation) : null;
}

async function openaiInterpret(input: InterpretInput): Promise<RawInterpretation | null> {
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
  return text ? (JSON.parse(text) as RawInterpretation) : null;
}

/* ---------------- rule-based fallback ---------------- */

const INTENT_KEYWORDS: { pattern: RegExp; criteria: string; output: string; topic: string }[] = [
  {
    pattern: /\b(gtm|go.to.market|sales|marketing|growth|business cofounder|biz dev)\b/i,
    criteria: "go-to-market, sales, marketing, growth, business cofounder, B2B",
    output: "A shortlist of relevant GTM/business people with reports and a recommended next step.",
    topic: "go-to-market and growth",
  },
  {
    pattern: /\b(cofounder|co-founder)\b/i,
    criteria: "cofounder, founder, startup, committed",
    output: "Potential cofounder candidates with match reports and recommended next steps.",
    topic: "a potential cofounder conversation",
  },
  {
    pattern: /\b(early users?|design partners?|beta|pilots?|customers?)\b/i,
    criteria: "early adopters, design partners, potential users, pilot customers",
    output: "A list of people open to trying the product, with context on why they fit.",
    topic: "trying an early product",
  },
  {
    pattern: /\b(feedback|review|opinion|pricing|advice)\b/i,
    criteria: "experienced operators or experts who can give concrete feedback",
    output: "Candid feedback collected from relevant people, summarized with sources.",
    topic: "exchanging some feedback",
  },
  {
    pattern: /\b(technical|engineer|developer|cto|architect)\b/i,
    criteria: "technical, engineering, developer, product builder",
    output: "Relevant technical people with reports and a recommended next step.",
    topic: "a technical conversation",
  },
  {
    pattern: /\b(advisor|mentor|expert)\b/i,
    criteria: "experienced advisor or domain expert",
    output: "Potential advisors with relevance reports and a recommended next step.",
    topic: "a possible advisory conversation",
  },
  {
    pattern: /\b(intro|introduction|connect|meet|talk|chat|call)\b/i,
    criteria: "people relevant to this request",
    output: "A structured report with findings and a recommended next step.",
    topic: "a short intro",
  },
];

function extractForbidden(request: string): string[] {
  const out: string[] = [];
  for (const m of request.matchAll(
    /(?:don'?t|do not|never|without)\s+(?:shar(?:e|ing)|mention(?:ing)?|reveal(?:ing)?|disclos(?:e|ing))\s+([^.;!?]+)/gi
  )) {
    out.push(m[1].trim());
  }
  return out;
}

/** A safe, minimal external message built ONLY from public/allowed context. */
function buildSafeOutreach(opts: {
  ownerName: string;
  topic: string;
  publicContext: string;
  targetName?: string;
}): string {
  const first = opts.ownerName.split(/\s+/)[0];
  const about = opts.publicContext.trim()
    ? ` ${first}'s work spans ${opts.publicContext.trim().replace(/\.*\s*$/, "")}.`
    : "";
  const ask = opts.targetName
    ? `Would ${opts.targetName} be open to a short intro to see if there's mutual relevance?`
    : `Would your owner be open to a short intro to see if there's mutual relevance?`;
  return `Hi — I represent ${opts.ownerName}, who is exploring ${opts.topic}.${about} ${ask}`;
}

function rulesInterpret(input: InterpretInput): RawInterpretation {
  const req = input.request.trim();
  const a = input.agent;
  const answeredAlready = input.history.length > 0;

  const lower = req.toLowerCase();
  const named = input.candidates.filter(
    (c) => lower.includes(`@${c.handle.toLowerCase()}`) || new RegExp(`\\b${c.name.toLowerCase()}\\b`).test(lower)
  );
  const intent = INTENT_KEYWORDS.find((k) => k.pattern.test(req));

  // Clarify when we can't tell WHAT the user wants (no intent, no named target) —
  // unless they already answered a question this conversation.
  if (!intent && !named.length && !answeredAlready) {
    return {
      kind: "clarify",
      reply: "I want to get this right before I draft anything.",
      question:
        "What kind of help is this — finding a cofounder, getting feedback, finding early users, or reaching a specific person? (If it's a specific person, tell me who.)",
    };
  }

  const fullRequest = [req, ...input.history.map((h) => h.answer)].join(" — ");
  const forbidden = extractForbidden(fullRequest);
  const mustNot = [a.must_not_share.trim(), ...forbidden].filter(Boolean).join(" Also for this mission: ");
  const askFirst = /\b(ask (?:me )?(?:before|first)|check with me|approval before)\b/i.test(fullRequest);

  const criteria = named.length
    ? `Specifically: ${named.map((c) => `${c.name} (@${c.handle})`).join(", ")}.`
    : `${intent?.criteria ?? "people relevant to this request"} — based on: ${fullRequest}`;

  // Public context for the outreach = topic words from the PUBLIC profile only
  // (tags/description), never the request's private parts.
  const publicContext = (a.tags || a.description).split(",").slice(0, 3).join(",");

  const words = req.replace(/^["']|["']$/g, "").split(/\s+/);
  const title = words.slice(0, 8).join(" ") + (words.length > 8 ? "…" : "");
  const topic = intent?.topic ?? "a short intro";

  return {
    kind: "draft",
    reply:
      `Got it. I'll work on this${forbidden.length ? " and keep the private parts out of anything I send" : ""}. ` +
      `Here's the mission I prepared — review the outreach message before anything goes out.`,
    fields: {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      goal: fullRequest,
      context: a.description || `Acting on behalf of ${input.user.name}.`,
      target_criteria: criteria,
      allowed_to_share: a.may_share || "Only what is on the public agent profile.",
      must_not_share: mustNot || "Contact details and anything private.",
      approval_policy: askFirst
        ? "Owner approval is required BEFORE contacting anyone, and again before sharing contact details or committing to anything."
        : DEFAULT_APPROVAL_POLICY,
      expected_output: intent?.output ?? "A structured report with findings, risks, and a recommended next step.",
      outreach_message: buildSafeOutreach({
        ownerName: input.user.name,
        topic,
        publicContext,
        targetName: named[0]?.name,
      }),
      target_handles: named.map((c) => c.handle),
      recommended_handles: [],
    },
  };
}

/* ---------------- validation + entry point ---------------- */

/** Strip leak patterns from an outreach message: it must never reference withholding. */
function scrubOutreach(message: string, internal: { mustNot: string; request: string }): string {
  let msg = message.trim().slice(0, 700);
  // Remove sentences that reference withholding/secrecy — the message must omit, not announce.
  const leakPattern =
    /[^.!?]*\b(can'?t share|cannot share|not able to share|won'?t share|not allowed|without (?:his|her|their|the owner'?s|approval)|confidential|private strategy|undisclosed|must not|keeping .{0,30}private)\b[^.!?]*[.!?]/gi;
  msg = msg.replace(leakPattern, "").replace(/\s{2,}/g, " ").trim();
  // Remove any verbatim fragments of the internal never-share list (≥12 chars).
  for (const part of internal.mustNot.split(/[,;]/)) {
    const frag = part.trim();
    if (frag.length >= 12) msg = msg.split(frag).join("");
  }
  return msg.replace(/\s{2,}/g, " ").trim();
}

function sanitizeFields(fields: MissionDraftFields, input: InterpretInput): MissionDraftFields {
  const str = (v: unknown, max = 1500) => String(v ?? "").trim().slice(0, max);
  const valid = new Set(input.candidates.map((c) => c.handle));
  const handles = (v: unknown) =>
    Array.isArray(v) ? v.map((h) => String(h).replace(/^@/, "")).filter((h) => valid.has(h)).slice(0, 5) : [];

  // A draft can narrow permissions but never drop the profile's never-share list.
  let mustNot = str(fields.must_not_share);
  const profileMustNot = input.agent.must_not_share.trim();
  if (profileMustNot && !mustNot.toLowerCase().includes(profileMustNot.slice(0, 40).toLowerCase())) {
    mustNot = [profileMustNot, mustNot].filter(Boolean).join(" Additionally: ");
  }

  const named = handles(fields.target_handles);
  const namedName = named.length
    ? input.candidates.find((c) => c.handle === named[0])?.name
    : undefined;

  let outreach = scrubOutreach(str(fields.outreach_message, 700), {
    mustNot,
    request: input.request,
  });
  if (outreach.length < 30) {
    outreach = buildSafeOutreach({
      ownerName: input.user.name,
      topic: "a short intro",
      publicContext: input.agent.tags || "",
      targetName: namedName,
    });
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
    outreach_message: outreach,
    target_handles: named,
    recommended_handles: handles(fields.recommended_handles),
  };
}

function finalize(raw: RawInterpretation, input: InterpretInput, source: InterpretResult["source"]): InterpretResult {
  if (raw.kind === "clarify" && raw.question) {
    return {
      kind: "clarify",
      reply: String(raw.reply ?? "Quick question first:").slice(0, 300),
      question: String(raw.question).slice(0, 400),
      source,
    };
  }
  const fields = sanitizeFields((raw.fields ?? {}) as MissionDraftFields, input);
  return {
    kind: "draft",
    reply:
      String(raw.reply ?? "").slice(0, 500) ||
      "Here's the mission I prepared — review the outreach message before anything goes out.",
    fields,
    source,
  };
}

export async function interpretRequest(input: InterpretInput): Promise<InterpretResult> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const raw = await anthropicInterpret(input);
      if (raw) return finalize(raw, input, "anthropic");
    } catch (err) {
      console.error("Anthropic interpretation failed, falling back:", err);
    }
  }
  if (process.env.OPENAI_API_KEY) {
    try {
      const raw = await openaiInterpret(input);
      if (raw) return finalize(raw, input, "openai");
    } catch (err) {
      console.error("OpenAI interpretation failed, falling back:", err);
    }
  }
  return finalize(rulesInterpret(input), input, "rules");
}
