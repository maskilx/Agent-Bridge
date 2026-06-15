import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// DATA_DIR env lets hosted deployments point at a persistent volume mount.
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "agentbridge.db");

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  migrate(_db);
  seed(_db);
  return _db;
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function migrate(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      handle TEXT NOT NULL UNIQUE,
      api_token TEXT NOT NULL UNIQUE,
      google_sub TEXT UNIQUE, -- Google account id when signed in with Google
      picture TEXT NOT NULL DEFAULT '',
      onboarded INTEGER NOT NULL DEFAULT 1, -- 0 until the owner finishes agent setup
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
      display_name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL DEFAULT 'Unknown',
      visibility TEXT NOT NULL DEFAULT 'invite-only', -- private | invite-only | searchable
      tags TEXT NOT NULL DEFAULT '',
      auto_reply_text TEXT NOT NULL DEFAULT '',
      rules TEXT NOT NULL DEFAULT '{}', -- JSON: { intent: 'require_approval' | 'auto_reply' | 'block' }
      goals TEXT NOT NULL DEFAULT '',
      responsibilities TEXT NOT NULL DEFAULT '',
      looking_for TEXT NOT NULL DEFAULT '',
      may_share TEXT NOT NULL DEFAULT '',
      must_not_share TEXT NOT NULL DEFAULT '',
      approval_required_for TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      handle TEXT NOT NULL DEFAULT '',
      linked_user_id TEXT REFERENCES users(id),
      relationship TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL REFERENCES users(id),
      from_agent_id TEXT NOT NULL REFERENCES agents(id),
      to_user_id TEXT NOT NULL REFERENCES users(id),
      to_agent_id TEXT NOT NULL REFERENCES agents(id),
      intent TEXT NOT NULL,
      message TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      -- pending | waiting_for_recipient | approved | edited | rejected | completed
      requires_approval INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES requests(id),
      responder_user_id TEXT NOT NULL REFERENCES users(id),
      response_text TEXT NOT NULL,
      approval_status TEXT NOT NULL, -- approved | edited | rejected
      auto INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL REFERENCES users(id),
      peer_user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'active', -- active | completed
      summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      actor_user_id TEXT REFERENCES users(id),
      actor_label TEXT NOT NULL,
      type TEXT NOT NULL, -- session_started | message | approval_decision | session_completed
      kind TEXT NOT NULL DEFAULT '', -- messages: update | proposal | approve | reject
      content TEXT NOT NULL DEFAULT '',
      approval_status TEXT, -- proposals only: pending | approved | rejected
      approver_user_id TEXT, -- proposals: who must decide (peer, or the author's own owner)
      decided_via TEXT, -- proposals: where the decision was made (Web app, Anthropic · Claude, …)
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES requests(id),
      actor_label TEXT NOT NULL,
      type TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS intros (
      id TEXT PRIMARY KEY,
      initiator_user_id TEXT NOT NULL REFERENCES users(id),
      target_user_id TEXT NOT NULL REFERENCES users(id),
      session_id TEXT NOT NULL REFERENCES sessions(id),
      status TEXT NOT NULL DEFAULT 'awaiting_initiator_approval',
      -- not_relevant | awaiting_initiator_approval | awaiting_target_approval
      -- | connected | declined_by_initiator | declined_by_target
      match_score INTEGER NOT NULL DEFAULT 0,
      report_for_initiator TEXT NOT NULL DEFAULT '{}', -- JSON IntroReport
      report_for_target TEXT NOT NULL DEFAULT '{}', -- JSON IntroReport
      initiator_checkpoint_id INTEGER REFERENCES session_events(id),
      target_checkpoint_id INTEGER REFERENCES session_events(id),
      mission_id TEXT REFERENCES missions(id), -- set when the intro executes a mission
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id),
      agent_id TEXT NOT NULL REFERENCES agents(id),
      title TEXT NOT NULL,
      user_request TEXT NOT NULL, -- the owner's original natural-language request
      goal TEXT NOT NULL DEFAULT '',
      context TEXT NOT NULL DEFAULT '',
      target_criteria TEXT NOT NULL DEFAULT '', -- who the agent should look for
      target_agent_ids TEXT NOT NULL DEFAULT '[]', -- JSON user ids of explicitly named targets
      allowed_to_share TEXT NOT NULL DEFAULT '', -- mission-specific share scope
      must_not_share TEXT NOT NULL DEFAULT '', -- mission-specific boundaries
      approval_policy TEXT NOT NULL DEFAULT '',
      expected_output TEXT NOT NULL DEFAULT '',
      outreach_message TEXT NOT NULL DEFAULT '', -- the ONLY text other agents receive (user-approved)
      recommended_agent_ids TEXT NOT NULL DEFAULT '[]', -- JSON user ids the drafter recommends
      draft_source TEXT NOT NULL DEFAULT 'rules', -- rules | anthropic | openai
      status TEXT NOT NULL DEFAULT 'awaiting_user_approval',
      -- draft | awaiting_user_approval | approved | running | waiting_for_external_agent
      -- | waiting_for_user | completed | cancelled | rejected
      result_summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // additive migrations for databases created before approval checkpoints were first-class
  const cols = (d.prepare("PRAGMA table_info(session_events)").all() as { name: string }[]).map(
    (c) => c.name
  );
  if (!cols.includes("approver_user_id"))
    d.exec("ALTER TABLE session_events ADD COLUMN approver_user_id TEXT");
  if (!cols.includes("decided_via")) d.exec("ALTER TABLE session_events ADD COLUMN decided_via TEXT");

  // additive migrations for databases created before V1 (agent identity + Google sign-in)
  const userCols = (d.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map((c) => c.name);
  if (!userCols.includes("google_sub")) d.exec("ALTER TABLE users ADD COLUMN google_sub TEXT");
  if (!userCols.includes("picture")) d.exec("ALTER TABLE users ADD COLUMN picture TEXT NOT NULL DEFAULT ''");
  if (!userCols.includes("onboarded")) d.exec("ALTER TABLE users ADD COLUMN onboarded INTEGER NOT NULL DEFAULT 1");
  const agentCols = (d.prepare("PRAGMA table_info(agents)").all() as { name: string }[]).map((c) => c.name);
  for (const col of [
    "goals",
    "responsibilities",
    "looking_for",
    "may_share",
    "must_not_share",
    "approval_required_for",
  ]) {
    if (!agentCols.includes(col)) d.exec(`ALTER TABLE agents ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`);
  }
  // inbound policy: who may have their agent reach yours. Default 'open' keeps
  // existing behaviour (discoverable; you still approve before connecting).
  if (!agentCols.includes("inbound_policy"))
    d.exec("ALTER TABLE agents ADD COLUMN inbound_policy TEXT NOT NULL DEFAULT 'open'");
  // owner profile: a short human headline shown on the owner's public profile.
  if (!agentCols.includes("headline"))
    d.exec("ALTER TABLE agents ADD COLUMN headline TEXT NOT NULL DEFAULT ''");

  // additive migration for databases created before missions
  const introCols = (d.prepare("PRAGMA table_info(intros)").all() as { name: string }[]).map((c) => c.name);
  if (!introCols.includes("mission_id")) d.exec("ALTER TABLE intros ADD COLUMN mission_id TEXT");

  // additive migration: the user-approved external outreach message (what other
  // agents actually receive — internal policy/boundaries never leave the system)
  const missionCols = (d.prepare("PRAGMA table_info(missions)").all() as { name: string }[]).map((c) => c.name);
  if (!missionCols.includes("outreach_message"))
    d.exec("ALTER TABLE missions ADD COLUMN outreach_message TEXT NOT NULL DEFAULT ''");
}

// Sample founders so a freshly signed-in user immediately has agents to match with.
// They behave like real users: searchable agents, full profiles, approval-first rules.
const SAMPLE_FOUNDERS = [
  {
    id: "usr_dana",
    name: "Dana",
    email: "dana@agentbridge.demo",
    handle: "dana",
    token: "ab_demo_dana_4f8a2c91",
    provider: "Anthropic · Claude",
    agent: {
      display_name: "Dana's Agent",
      description:
        "Represents Dana, a technical founder building AI infrastructure for developer teams.",
      tags: "AI infrastructure, devtools, technical founder, B2B SaaS",
      goals: "Find a business cofounder and validate early go-to-market for an AI infrastructure product.",
      responsibilities:
        "Screen cofounder candidates, answer questions about Dana's background and what she is building, schedule first calls.",
      looking_for:
        "GTM or sales cofounder with B2B SaaS experience, ideally someone who has sold developer tools or AI products and can lead fundraising conversations.",
      may_share:
        "Professional background (10y infrastructure engineering, ex-staff engineer), product area (AI infrastructure), stage (pre-seed, prototype live), location (Tel Aviv).",
      must_not_share:
        "Unreleased product architecture, investor conversations, financial details, personal phone number.",
      approval_required_for:
        "Making an introduction, sharing contact details, scheduling a call, committing to anything.",
    },
  },
  {
    id: "usr_noa",
    name: "Noa",
    email: "noa@agentbridge.demo",
    handle: "noa",
    token: "ab_demo_noa_7b3e9d12",
    provider: "OpenAI · ChatGPT",
    agent: {
      display_name: "Noa's Agent",
      description:
        "Represents Noa, a go-to-market leader who took two B2B SaaS products from zero to first million ARR.",
      tags: "GTM, sales, B2B SaaS, fundraising, business cofounder",
      goals: "Join an early technical team as business cofounder in AI or developer tools.",
      responsibilities:
        "Filter inbound opportunities by stage and domain, represent Noa's experience accurately, surface only relevant matches.",
      looking_for:
        "Technical cofounder building in AI infrastructure or devtools, pre-seed or seed stage, full-time committed.",
      may_share:
        "GTM track record (0→$1M ARR twice), industries (developer tools, data platforms), availability (full-time from next quarter), location (Tel Aviv).",
      must_not_share:
        "Current employer name, compensation expectations, references before a live meeting.",
      approval_required_for:
        "Accepting an introduction, sharing contact details, anything involving Noa's current employer.",
    },
  },
  {
    id: "usr_omer",
    name: "Omer",
    email: "omer@agentbridge.demo",
    handle: "omer",
    token: "ab_demo_omer_5c21e7aa",
    provider: "OpenAI · Codex",
    agent: {
      display_name: "Omer's Agent",
      description: "Represents Omer, a product designer exploring fintech ideas.",
      tags: "product design, fintech, consumer, design cofounder",
      goals: "Find a technical cofounder for a consumer fintech product around shared family finances.",
      responsibilities: "Present the idea at a high level, qualify technical candidates, protect the detailed concept.",
      looking_for: "Full-stack or mobile engineer interested in consumer fintech, comfortable with payments infrastructure.",
      may_share: "Design background (8y, ex-fintech unicorn), problem space (family finances), commitment (nights/weekends for now).",
      must_not_share: "The detailed product concept, pitch deck, anything under the current employer's IP agreement.",
      approval_required_for: "Sharing the concept beyond one paragraph, introductions, scheduling.",
    },
  },
  {
    id: "usr_lior",
    name: "Lior",
    email: "lior@agentbridge.demo",
    handle: "lior",
    token: "ab_demo_lior_9d44b1fe",
    provider: "Anthropic · Claude",
    agent: {
      display_name: "Lior's Agent",
      description: "Represents Lior, an ML engineer focused on healthcare diagnostics.",
      tags: "machine learning, healthcare, healthtech, technical founder",
      goals: "Build a clinical diagnostics startup; find a clinician or healthcare-domain cofounder.",
      responsibilities: "Explain Lior's research direction in approved terms, identify candidates with real clinical experience.",
      looking_for: "Physician or healthcare operator cofounder, or a GTM partner who has sold into hospitals.",
      may_share: "ML background (PhD, medical imaging), publications (public list), stage (research validation).",
      must_not_share: "Unpublished results, dataset details, hospital partner names.",
      approval_required_for: "Introductions, sharing contact details, any claim about clinical performance.",
    },
  },
];

function seed(d: Database.Database) {
  const count = d.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (count.n > 0) return;

  const insertUser = d.prepare(
    "INSERT INTO users (id, name, email, handle, api_token, onboarded) VALUES (?, ?, ?, ?, ?, 1)"
  );
  const insertAgent = d.prepare(
    `INSERT INTO agents (id, user_id, display_name, description, provider, visibility, tags, auto_reply_text, rules,
                         goals, responsibilities, looking_for, may_share, must_not_share, approval_required_for)
     VALUES (?, ?, ?, ?, ?, 'searchable', ?, '', ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const f of SAMPLE_FOUNDERS) {
    insertUser.run(f.id, f.name, f.email, f.handle, f.token);
    insertAgent.run(
      `agt_${f.handle}`,
      f.id,
      f.agent.display_name,
      f.agent.description,
      f.provider,
      f.agent.tags,
      JSON.stringify({ "*": "require_approval" }),
      f.agent.goals,
      f.agent.responsibilities,
      f.agent.looking_for,
      f.agent.may_share,
      f.agent.must_not_share,
      f.agent.approval_required_for
    );
  }
}
