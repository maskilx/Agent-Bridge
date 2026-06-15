import { db } from "./db";
import type { Agent, User } from "./core";

/**
 * Deterministic, local relevance scoring between two agent profiles.
 * V1 intentionally uses no LLM here: the agent's "judgement" is a transparent
 * overlap between what one owner is looking for and what the other offers.
 * Swap this module for a model call later without touching the intro flow.
 */

const STOPWORDS = new Set(
  `a an and are as at be but by can do for from has have he her his i if in is it its
   me my no not of on or our she so that the their them they this to was we what who
   will with you your ideally someone something looking experience stage early who's
   full-time committed interested comfortable real two zero first next now`.split(/\s+/)
);

export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9$]+/)
      .filter((w) => w.length >= 2 && !STOPWORDS.has(w))
  );
}

function profileTokens(agent: Agent): Set<string> {
  return tokenize(
    [agent.goals, agent.description, agent.tags, agent.responsibilities, agent.may_share].join(" ")
  );
}

export const RELEVANCE_THRESHOLD = 25;

export type MatchScore = {
  score: number; // 0–100
  /** Terms from MY "looking for" found in THEIR profile. */
  forward: string[];
  /** Terms from THEIR "looking for" found in MY profile. */
  reverse: string[];
};

export function scoreMatch(mine: Agent, theirs: Agent): MatchScore {
  const myNeeds = tokenize(mine.looking_for);
  const theirNeeds = tokenize(theirs.looking_for);
  const forward = [...myNeeds].filter((t) => profileTokens(theirs).has(t));
  const reverse = [...theirNeeds].filter((t) => profileTokens(mine).has(t));
  const mutualBonus = forward.length >= 2 && reverse.length >= 2 ? 15 : 0;
  const score = Math.min(100, forward.length * 9 + reverse.length * 7 + mutualBonus);
  return { score, forward, reverse };
}

export type Match = {
  user: Pick<User, "id" | "name" | "handle" | "email" | "picture">;
  agent: Agent;
  score: number;
  forward: string[];
  reverse: string[];
};

export type MatchLabel = "best" | "strong" | "possible";

/** Human-readable relevance label — we show this instead of a raw 0–100 score. */
export function matchLabel(score: number): MatchLabel {
  if (score >= 60) return "best";
  if (score >= 25) return "strong";
  return "possible";
}

/** All searchable agents of other onboarded users, scored against the viewer's profile. */
export function listMatches(viewerUserId: string, viewerAgent: Agent): Match[] {
  const rows = db()
    .prepare(
      `SELECT u.id AS uid, u.name, u.handle, u.email, u.picture
       FROM users u JOIN agents a ON a.user_id = u.id
       WHERE u.id != ? AND u.onboarded = 1 AND a.visibility = 'searchable'`
    )
    .all(viewerUserId) as { uid: string; name: string; handle: string; email: string; picture: string }[];

  const matches: Match[] = rows.map((r) => {
    const agent = db().prepare("SELECT * FROM agents WHERE user_id = ?").get(r.uid) as Agent;
    const { score, forward, reverse } = scoreMatch(viewerAgent, agent);
    return {
      user: { id: r.uid, name: r.name, handle: r.handle, email: r.email, picture: r.picture },
      agent,
      score,
      forward,
      reverse,
    };
  });
  return matches.sort((a, b) => b.score - a.score);
}

/* ---------------- mission-specific matching ---------------- */

/** The mission fields relevance is computed from (kept structural to avoid a module cycle). */
export type MissionLike = {
  user_request: string;
  goal: string;
  context: string;
  target_criteria: string;
  target_agent_ids: string; // JSON array of user ids
};

export function missionTokens(mission: MissionLike): Set<string> {
  return tokenize([mission.target_criteria, mission.goal, mission.user_request].join(" "));
}

/** Score one candidate against a MISSION (not the static profile). */
export function scoreMissionMatch(mission: MissionLike, mine: Agent, theirs: Agent): MatchScore {
  const needs = missionTokens(mission);
  const theirNeeds = tokenize(theirs.looking_for);
  const myContext = new Set([...profileTokens(mine), ...tokenize(mission.goal + " " + mission.context)]);
  const forward = [...needs].filter((t) => profileTokens(theirs).has(t));
  const reverse = [...theirNeeds].filter((t) => myContext.has(t));
  const mutualBonus = forward.length >= 2 && reverse.length >= 2 ? 15 : 0;
  const score = Math.min(100, forward.length * 8 + reverse.length * 6 + mutualBonus);
  return { score, forward, reverse };
}

export type MissionMatch = Match & {
  /** Explicitly named in the mission — always surfaced first. */
  named: boolean;
  /** One-sentence explanation of why this target fits the mission. */
  fit: string;
  /** Risks / missing info for this target, mission-specific. */
  caveats: string[];
};

/** Candidates ranked for a specific mission: named targets first, then by mission relevance. */
export function listMissionMatches(viewerUserId: string, viewerAgent: Agent, mission: MissionLike): MissionMatch[] {
  const namedIds = new Set<string>(JSON.parse(mission.target_agent_ids || "[]") as string[]);
  const base = listMatches(viewerUserId, viewerAgent);

  const ranked: MissionMatch[] = base.map((m) => {
    const { score, forward, reverse } = scoreMissionMatch(mission, viewerAgent, m.agent);
    const named = namedIds.has(m.user.id);
    const caveats: string[] = [];
    if (!reverse.length)
      caveats.push(`Nothing in this mission obviously matches what ${m.user.name} says they're looking for.`);
    if (!m.agent.looking_for.trim()) caveats.push("They don't state what they're looking for.");
    const fit = named
      ? `Explicitly named in your request.`
      : forward.length
        ? `Their profile matches the mission on: ${forward.slice(0, 6).join(", ")}.`
        : `No clear overlap with the mission criteria.`;
    return { ...m, score, forward, reverse, named, fit, caveats };
  });

  return ranked.sort((a, b) => Number(b.named) - Number(a.named) || b.score - a.score);
}
