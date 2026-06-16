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
 * Provider selection via LLM_PROVIDER (falls back to rules on ANY error, timeout,
 * rate-limit, quota, missing key, or invalid output):
 *   LLM_PROVIDER=google    → Google Gemini (GOOGLE_API_KEY, LLM_MODEL)
 *   LLM_PROVIDER=anthropic → Anthropic Messages API (ANTHROPIC_MODEL)
 *   LLM_PROVIDER=openai    → OpenAI Chat Completions (OPENAI_MODEL)
 *   LLM_PROVIDER=none / unset+no key → deterministic rule-based fallback (no calls, ever)
 *
 * The model is ONLY invoked on explicit user actions (submitting a mission, and
 * the summarize/next-step helpers below) — never on page load, render, polling,
 * or background loops. Calls are capped (input length, output tokens, timeout,
 * <=1 retry, per-context caching, optional daily limit) for free-tier safety.
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
  /** Compact, profile-level recaps of group conversations this owner is part of.
   *  Background only — used to understand the request; never sent externally. */
  groupContext?: { title: string; goal: string; digest: string }[];
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

export type LLMSource = "google" | "anthropic" | "openai" | "rules";

export type InterpretResult = (
  | { kind: "clarify"; reply: string; question: string; source: LLMSource }
  | { kind: "draft"; reply: string; fields: MissionDraftFields; source: LLMSource }
) & {
  /** Why the rules fallback was used (set only when source === "rules" after a
   *  provider was configured/attempted). Safe to log — never contains secrets. */
  fallbackReason?: string;
};

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
  const groupLines = (input.groupContext ?? [])
    .map((g) => `- "${g.title}"${g.goal ? ` (goal: ${g.goal})` : ""}:\n${g.digest}`)
    .join("\n")
    .slice(0, 1200);
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
      (groupLines
        ? `Relevant group conversations ${input.user.name} is part of (BACKGROUND ONLY — ` +
          `use it to understand what the request refers to; never repeat or share it externally):\n${groupLines}\n\n`
        : "") +
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

/* ---------------- google gemini provider ---------------- */

async function googleInterpret(input: InterpretInput): Promise<RawInterpretation | null> {
  const { system, user } = buildPrompt(input);
  const model = LLM.googleModel;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GOOGLE_API_KEY! },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        // responseMimeType forces strictly-valid JSON; the prompt defines the shape,
        // and finalize()/sanitizeFields() validate it before anything is used.
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: LLM.maxOutputTokens,
          temperature: 0.4,
        },
      }),
      signal: AbortSignal.timeout(LLM.timeoutMs),
    }
  );
  // 429 = rate limit / quota exhausted → throw so the caller falls back to rules
  if (!res.ok) throw new Error(`Google API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as {
    promptFeedback?: { blockReason?: string };
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  };
  const cand = data.candidates?.[0];
  if (!cand || data.promptFeedback?.blockReason || cand.finishReason === "SAFETY") return null;
  const text = (cand.content?.parts ?? []).map((p) => p.text ?? "").join("");
  return text ? (JSON.parse(text) as RawInterpretation) : null;
}

/* ---------------- LLM controls: provider gate, caps, cache, daily limit ---------------- */

const LLM = {
  get provider(): LLMSource {
    const p = (process.env.LLM_PROVIDER ?? "").trim().toLowerCase();
    if (p === "none") return "rules";
    if (p === "google") return process.env.GOOGLE_API_KEY ? "google" : "rules";
    if (p === "anthropic") return process.env.ANTHROPIC_API_KEY ? "anthropic" : "rules";
    if (p === "openai") return process.env.OPENAI_API_KEY ? "openai" : "rules";
    // no explicit provider → auto-detect by key (back-compat), else rules
    if (process.env.GOOGLE_API_KEY) return "google";
    if (process.env.ANTHROPIC_API_KEY) return "anthropic";
    if (process.env.OPENAI_API_KEY) return "openai";
    return "rules";
  },
  get googleModel() {
    return process.env.LLM_MODEL?.trim() || "gemini-2.5-flash-lite";
  },
  maxInputChars: Number(process.env.LLM_MAX_INPUT_CHARS) || 6000,
  maxOutputTokens: Number(process.env.LLM_MAX_OUTPUT_TOKENS) || 1024,
  timeoutMs: Number(process.env.LLM_TIMEOUT_MS) || 15_000,
  maxRetries: Math.min(1, Math.max(0, Number(process.env.LLM_MAX_RETRIES) || 0)),
  dailyLimit: Number(process.env.LLM_DAILY_LIMIT) || 200,
};

function devLog(...args: unknown[]) {
  if (process.env.NODE_ENV !== "production") console.log("[llm]", ...args);
}

// Per-process daily request counter (best-effort free-tier guard; resets by date).
let _day = "";
let _count = 0;
function withinDailyLimit(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== _day) {
    _day = today;
    _count = 0;
  }
  return _count < LLM.dailyLimit;
}

// Cache interpretations by a stable hash of the minimal context — so we never
// call the model twice for the same request/profile/candidate set.
const _interpretCache = new Map<string, InterpretResult>();
function hashContext(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
function interpretKey(provider: LLMSource, input: InterpretInput): string {
  return hashContext(
    JSON.stringify({
      provider,
      model: LLM.googleModel,
      request: input.request,
      history: input.history,
      agent: {
        d: input.agent.description,
        g: input.agent.goals,
        lf: input.agent.looking_for,
        ms: input.agent.may_share,
        mns: input.agent.must_not_share,
      },
      cands: input.candidates.map((c) => c.handle),
      groups: (input.groupContext ?? []).map((g) => `${g.title}|${g.digest}`),
    })
  );
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

  // Group context (already profile-level) enriches the owner-facing notes only.
  const groupNote = (input.groupContext ?? [])
    .map((g) => `${g.title}${g.goal ? ` — ${g.goal}` : ""}`)
    .join("; ");

  return {
    kind: "draft",
    reply:
      `Got it. I'll work on this${forbidden.length ? " and keep the private parts out of anything I send" : ""}. ` +
      `Here's the mission I prepared — review the outreach message before anything goes out.`,
    fields: {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      goal: fullRequest,
      context: [a.description || `Acting on behalf of ${input.user.name}.`, groupNote ? `Following group discussion: ${groupNote}.` : ""]
        .filter(Boolean)
        .join(" "),
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

function rulesFallback(input: InterpretInput, reason: string): InterpretResult {
  const r = finalize(rulesInterpret(input), input, "rules");
  r.fallbackReason = reason;
  return r;
}

export async function interpretRequest(input: InterpretInput): Promise<InterpretResult> {
  const provider = LLM.provider;
  if (provider === "rules")
    return rulesFallback(input, "LLM disabled (LLM_PROVIDER unset or 'none', or no API key)");

  // Cost/privacy: cap input size and trim history to the most recent turns.
  const capped: InterpretInput = {
    ...input,
    request: input.request.slice(0, LLM.maxInputChars),
    history: input.history.slice(-6),
  };

  // Never call the model twice for the same context.
  const key = interpretKey(provider, capped);
  const hit = _interpretCache.get(key);
  if (hit) {
    devLog("interpret cache hit", provider);
    return hit;
  }

  if (!withinDailyLimit()) {
    devLog("daily LLM limit reached — using rule-based fallback");
    return rulesFallback(input, `daily LLM call limit reached (LLM_DAILY_LIMIT=${LLM.dailyLimit})`);
  }

  const run =
    provider === "google" ? googleInterpret : provider === "anthropic" ? anthropicInterpret : openaiInterpret;

  let reason = `${provider} returned no usable output`;
  for (let attempt = 0; attempt <= LLM.maxRetries; attempt++) {
    try {
      _count++;
      devLog(`interpret via ${provider} (attempt ${attempt + 1}/${LLM.maxRetries + 1})`);
      const raw = await run(capped);
      if (!raw) {
        reason = `${provider} refused or returned no usable output`;
        break; // refusal / safety block / empty → deterministic fallback
      }
      const result = finalize(raw, capped, provider);
      _interpretCache.set(key, result);
      if (_interpretCache.size > 200) _interpretCache.delete(_interpretCache.keys().next().value!);
      return result;
    } catch (err) {
      reason = `${provider}: ${(err as Error).message}`.slice(0, 200);
      devLog(`${provider} interpret failed (attempt ${attempt + 1}):`, (err as Error).message);
      // any failure — timeout, 429 rate-limit/quota, network, bad JSON — falls through
    }
  }
  return rulesFallback(input, reason);
}

/* =======================================================================
   summarizeReply + recommendNextStep — the other two narrow LLM uses.
   Called ONLY on explicit user actions (e.g. a "Summarize reply" / "Suggest
   next step" button). Same guards as interpretRequest; minimal context only
   (mission goal + the reply/conversation text — never private notes, the
   never-share list, or full records); always falls back to deterministic text.
   The model proposes text for the owner to read — it never sends anything.
   ======================================================================= */

const _textCache = new Map<string, string>();

/** Low-level guarded text generation. Returns null whenever the LLM is disabled
 *  or anything goes wrong, so callers use their deterministic fallback. */
async function generateText(system: string, user: string, seed: string): Promise<string | null> {
  const provider = LLM.provider;
  if (provider === "rules") return null;

  const prompt = user.slice(0, LLM.maxInputChars);
  const key = hashContext(JSON.stringify({ provider, model: LLM.googleModel, system, seed, prompt }));
  const cached = _textCache.get(key);
  if (cached !== undefined) {
    devLog("text cache hit", provider);
    return cached;
  }
  if (!withinDailyLimit()) {
    devLog("daily LLM limit reached — using text fallback");
    return null;
  }

  for (let attempt = 0; attempt <= LLM.maxRetries; attempt++) {
    try {
      _count++;
      let text: string | null = null;
      if (provider === "google") {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(LLM.googleModel)}:generateContent`,
          {
            method: "POST",
            headers: { "content-type": "application/json", "x-goog-api-key": process.env.GOOGLE_API_KEY! },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: system }] },
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: LLM.maxOutputTokens, temperature: 0.3 },
            }),
            signal: AbortSignal.timeout(LLM.timeoutMs),
          }
        );
        if (!res.ok) throw new Error(`Google API ${res.status}`);
        const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("") || null;
      } else if (provider === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": process.env.ANTHROPIC_API_KEY!,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
            max_tokens: LLM.maxOutputTokens,
            system,
            messages: [{ role: "user", content: prompt }],
          }),
          signal: AbortSignal.timeout(LLM.timeoutMs),
        });
        if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
        const data = (await res.json()) as { content?: { type: string; text?: string }[] };
        text = data.content?.find((b) => b.type === "text")?.text ?? null;
      } else {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`, "content-type": "application/json" },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
            max_tokens: LLM.maxOutputTokens,
            messages: [
              { role: "system", content: system },
              { role: "user", content: prompt },
            ],
          }),
          signal: AbortSignal.timeout(LLM.timeoutMs),
        });
        if (!res.ok) throw new Error(`OpenAI API ${res.status}`);
        const data = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
        text = data.choices?.[0]?.message?.content ?? null;
      }

      const clean = (text ?? "").trim();
      if (clean) {
        _textCache.set(key, clean);
        if (_textCache.size > 200) _textCache.delete(_textCache.keys().next().value!);
        return clean;
      }
      return null;
    } catch (err) {
      devLog(`${provider} text gen failed (attempt ${attempt + 1}):`, (err as Error).message);
    }
  }
  return null;
}

/** Summarize an incoming reply for the owner. Falls back to a trimmed quote. */
export async function summarizeReply(opts: {
  missionGoal: string;
  reply: string;
}): Promise<{ text: string; source: LLMSource }> {
  const reply = opts.reply.trim();
  const fallback = reply.length > 240 ? `They replied: "${reply.slice(0, 220).trim()}…"` : `They replied: "${reply}"`;
  const llm = await generateText(
    "You summarize a reply that another agent sent back, for the owner to read. " +
      "1-2 neutral sentences. Do not invent facts. Do not add opinions or next steps.",
    `Mission goal: ${opts.missionGoal}\n\nReply received:\n"""${reply}"""\n\nSummarize the reply.`,
    `summary:${opts.missionGoal}`
  );
  return llm ? { text: llm.slice(0, 600), source: LLM.provider } : { text: fallback, source: "rules" };
}

/** Suggest one concrete next step for the owner. Falls back to a safe default. */
export async function recommendNextStep(opts: {
  missionGoal: string;
  conversation: string;
}): Promise<{ text: string; source: LLMSource }> {
  const fallback = "Review the exchange and, if it looks promising, approve a short intro — nothing is sent until you do.";
  const llm = await generateText(
    "You suggest ONE concrete next step (max one sentence) for the owner. " +
      "The agent never sends anything or commits to anything without the owner's explicit approval — reflect that.",
    `Mission goal: ${opts.missionGoal}\n\nConversation so far:\n"""${opts.conversation.slice(0, 3000)}"""\n\nRecommend one next step.`,
    `nextstep:${opts.missionGoal}`
  );
  return llm ? { text: llm.slice(0, 300), source: LLM.provider } : { text: fallback, source: "rules" };
}

/** Summarize where a group of agents stands, for the owner. Explicit action
 *  only; minimal context (goal + timeline text); falls back to a safe default. */
export async function summarizeGroup(opts: {
  goal: string;
  transcript: string;
}): Promise<{ text: string; source: LLMSource }> {
  const fallback =
    "Your agent gathered the group's responses above. Review who looks relevant and decide who to take forward — nothing is shared or committed until you approve.";
  const llm = await generateText(
    "You summarize a multi-agent group conversation for the owner. 2-4 neutral sentences: who looks " +
      "relevant or interested, any points of agreement, and what still needs the owner's decision. " +
      "Do not invent facts. Do not commit to anything on the owner's behalf.",
    `Group goal: ${opts.goal}\n\nConversation so far:\n"""${opts.transcript}"""\n\nSummarize where the group stands.`,
    `groupsum:${opts.goal}`
  );
  return llm ? { text: llm.slice(0, 800), source: LLM.provider } : { text: fallback, source: "rules" };
}
