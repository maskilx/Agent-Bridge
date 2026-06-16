"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, requireUser, setSession } from "./auth";
import {
  getUserById,
  getUserByEmail,
  createContact,
  createUser,
  markOnboarded,
  replyToRequest,
  setInboundPolicy,
  updateAgent,
} from "./core";
import { completeSession, decideProposal, sendSessionMessage, startSession } from "./sessions";
import { consentToIntro, decideIntro, requestIntro, syncIntros } from "./intros";
import { approveMission, cancelMission, completeMission, updateMissionDraft } from "./missions";
import {
  askGroup,
  askGroupMember,
  createGroup,
  decideGroupProposal,
  getGroupView,
  groupTranscript,
  postGroupMessage,
  postGroupSummary,
  proposeGroupAction,
} from "./groups";
import { summarizeGroup } from "./model";
import { allowedEmail, devLoginEnabled, sampleFoundersEnabled } from "./access";

/** Sign in as a seeded sample founder — development only (SHOW_SAMPLE_FOUNDERS=1, never in production). */
export async function loginAs(formData: FormData) {
  // Server-side block, independent of the UI: sample logins are email-less auth.
  if (!sampleFoundersEnabled() || !devLoginEnabled()) redirect("/login?error=signin_unavailable");
  const userId = String(formData.get("userId") ?? "");
  const user = getUserById(userId);
  if (!user || !user.email.endsWith("@agentbridge.demo")) redirect("/login");
  await setSession(user.api_token);
  redirect("/dashboard");
}

/**
 * Email-only sign-in for LOCAL DEVELOPMENT. It does not verify email ownership,
 * so the server rejects it outright in production (regardless of what the UI
 * shows) unless DANGEROUSLY_ALLOW_DEV_LOGIN=1 is set explicitly. Production
 * authentication is Google OAuth only.
 */
export async function devLogin(formData: FormData) {
  if (!devLoginEnabled()) redirect("/login?error=signin_unavailable");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!email.includes("@")) redirect("/login?error=bad_email");
  if (!allowedEmail(email)) redirect("/login?error=not_invited");
  const user = getUserByEmail(email) ?? createUser({ name: name || email.split("@")[0], email });
  await setSession(user.api_token);
  redirect(user.onboarded ? "/dashboard" : "/agent?setup=1");
}

export async function logout() {
  await clearSession();
  redirect("/");
}

export async function respondToRequest(formData: FormData) {
  const user = await requireUser();
  const requestId = String(formData.get("requestId") ?? "");
  const replyText = String(formData.get("replyText") ?? "");
  const approvalStatus = String(formData.get("approvalStatus") ?? "approved") as
    | "approved"
    | "edited"
    | "rejected";
  replyToRequest({ responderUserId: user.id, requestId, replyText, approvalStatus });
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  redirect(`/requests/${requestId}`);
}

/** Reply to an inbox request from inside the unified Chats thread. */
export async function respondInChatAction(formData: FormData) {
  const user = await requireUser();
  const requestId = String(formData.get("requestId") ?? "");
  const approvalStatus = String(formData.get("approvalStatus") ?? "approved") as "approved" | "edited" | "rejected";
  replyToRequest({
    responderUserId: user.id,
    requestId,
    replyText: String(formData.get("replyText") ?? ""),
    approvalStatus,
  });
  revalidatePath(`/conversations/request/${requestId}`);
  redirect(`/conversations/request/${requestId}`);
}

export async function addContact(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name) {
    createContact({
      ownerUserId: user.id,
      name,
      email: String(formData.get("email") ?? ""),
      handle: String(formData.get("handle") ?? ""),
      relationship: String(formData.get("relationship") ?? ""),
    });
  }
  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function startSessionAction(formData: FormData) {
  const user = await requireUser();
  const session = startSession({
    userId: user.id,
    withRef: String(formData.get("with") ?? ""),
    topic: String(formData.get("topic") ?? ""),
    message: String(formData.get("message") ?? "") || undefined,
  });
  revalidatePath("/sessions");
  redirect(`/sessions/${session.id}`);
}

export async function sendSessionMessageAction(formData: FormData) {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const kind = String(formData.get("kind") ?? "update") as "update" | "proposal";
  sendSessionMessage({
    userId: user.id,
    sessionId,
    message: String(formData.get("message") ?? ""),
    kind,
  });
  revalidatePath(`/sessions/${sessionId}`);
  redirect(`/sessions/${sessionId}`);
}

export async function decideProposalAction(formData: FormData) {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const decision = String(formData.get("decision") ?? "approved") as "approved" | "rejected";
  decideProposal(user.id, Number(formData.get("eventId") ?? 0), decision, "", "Web app");
  syncIntros(); // the checkpoint may belong to an introduction
  revalidatePath(`/sessions/${sessionId}`);
  redirect(`/sessions/${sessionId}`);
}

export async function requestIntroAction(formData: FormData) {
  const user = await requireUser();
  const missionId = String(formData.get("missionId") ?? "").trim();
  const intro = requestIntro(
    user.id,
    String(formData.get("targetUserId") ?? ""),
    missionId ? { missionId } : {}
  );
  revalidatePath("/intros");
  if (missionId) redirect(`/missions/${missionId}`);
  redirect(`/intros/${intro.id}`);
}

/* ---------------- missions ---------------- */

export async function updateMissionDraftAction(formData: FormData) {
  const user = await requireUser();
  const missionId = String(formData.get("missionId") ?? "");
  updateMissionDraft(user.id, missionId, {
    title: String(formData.get("title") ?? ""),
    goal: String(formData.get("goal") ?? ""),
    context: String(formData.get("context") ?? ""),
    target_criteria: String(formData.get("target_criteria") ?? ""),
    allowed_to_share: String(formData.get("allowed_to_share") ?? ""),
    must_not_share: String(formData.get("must_not_share") ?? ""),
    approval_policy: String(formData.get("approval_policy") ?? ""),
    expected_output: String(formData.get("expected_output") ?? ""),
    outreach_message: String(formData.get("outreach_message") ?? ""),
  });
  revalidatePath(`/missions/${missionId}`);
  redirect(`/missions/${missionId}`);
}

export async function approveMissionAction(formData: FormData) {
  const user = await requireUser();
  const missionId = String(formData.get("missionId") ?? "");
  const targets = formData.getAll("targets").map(String).filter(Boolean);
  approveMission(user.id, missionId, targets, {
    outreachMessage: String(formData.get("outreach_message") ?? "") || undefined,
  });
  revalidatePath(`/missions/${missionId}`);
  revalidatePath("/missions");
  redirect(`/missions/${missionId}`);
}

export async function cancelMissionAction(formData: FormData) {
  const user = await requireUser();
  const missionId = String(formData.get("missionId") ?? "");
  cancelMission(user.id, missionId);
  revalidatePath("/missions");
  redirect(`/missions/${missionId}`);
}

export async function completeMissionAction(formData: FormData) {
  const user = await requireUser();
  const missionId = String(formData.get("missionId") ?? "");
  completeMission(user.id, missionId, String(formData.get("result_summary") ?? ""));
  revalidatePath(`/missions/${missionId}`);
  redirect(`/missions/${missionId}`);
}

export async function consentToIntroAction(formData: FormData) {
  const user = await requireUser();
  const introId = String(formData.get("introId") ?? "");
  const decision = String(formData.get("decision") ?? "approved") === "rejected" ? "rejected" : "approved";
  consentToIntro(user.id, introId, decision);
  revalidatePath(`/intros/${introId}`);
  revalidatePath("/intros");
  redirect(`/intros/${introId}`);
}

export async function decideIntroAction(formData: FormData) {
  const user = await requireUser();
  const introId = String(formData.get("introId") ?? "");
  const decision = String(formData.get("decision") ?? "approved") as "approved" | "rejected";
  decideIntro(user.id, introId, decision, String(formData.get("note") ?? ""));
  revalidatePath(`/intros/${introId}`);
  revalidatePath("/intros");
  redirect(`/intros/${introId}`);
}

export async function completeSessionAction(formData: FormData) {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  completeSession({
    userId: user.id,
    sessionId,
    summary: String(formData.get("summary") ?? "") || undefined,
  });
  revalidatePath(`/sessions/${sessionId}`);
  redirect(`/sessions/${sessionId}`);
}

export async function saveAgentProfile(formData: FormData) {
  const user = await requireUser();
  const intents = ["availability_check", "scheduling", "question", "introduction"];
  const rules: Record<string, string> = {
    "*": String(formData.get("rule_default") ?? "require_approval"),
  };
  for (const intent of intents) {
    const value = String(formData.get(`rule_${intent}`) ?? "");
    if (value && value !== "inherit") rules[intent] = value;
  }
  updateAgent(user.id, {
    display_name: String(formData.get("display_name") ?? "").trim() || `${user.name}'s Agent`,
    description: String(formData.get("description") ?? "").trim(),
    headline: String(formData.get("headline") ?? "").trim(),
    visibility: String(formData.get("visibility") ?? "invite-only"),
    tags: String(formData.get("tags") ?? "").trim(),
    auto_reply_text: String(formData.get("auto_reply_text") ?? "").trim(),
    rules: JSON.stringify(rules),
    goals: String(formData.get("goals") ?? "").trim(),
    responsibilities: String(formData.get("responsibilities") ?? "").trim(),
    looking_for: String(formData.get("looking_for") ?? "").trim(),
    may_share: String(formData.get("may_share") ?? "").trim(),
    must_not_share: String(formData.get("must_not_share") ?? "").trim(),
    approval_required_for: String(formData.get("approval_required_for") ?? "").trim(),
  });

  const firstSetup = !user.onboarded;
  if (firstSetup) markOnboarded(user.id);
  revalidatePath("/agent");
  redirect(firstSetup ? "/matches" : "/agent");
}

/* ---------------- groups ---------------- */

export async function createGroupAction(formData: FormData) {
  const user = await requireUser();
  const memberUserIds = formData.getAll("member").map((m) => String(m)).filter(Boolean);
  const id = createGroup({
    ownerUserId: user.id,
    title: String(formData.get("title") ?? "").trim(),
    goal: String(formData.get("goal") ?? "").trim(),
    memberUserIds,
  });
  revalidatePath("/groups");
  redirect(`/conversations/group/${id}`);
}

export async function postGroupMessageAction(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  postGroupMessage(user.id, groupId, String(formData.get("content") ?? ""));
  revalidatePath(`/conversations/group/${groupId}`);
  redirect(`/conversations/group/${groupId}`);
}

/** Send into a group conversation. An @-mention can address a member's AGENT
 *  (it then replies, rule-based) or the OWNER (a directed message, no auto-reply). */
export async function groupSendAction(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const directedTo = String(formData.get("directedTo") ?? "").trim();
  const directedKind = String(formData.get("directedKind") ?? "");
  postGroupMessage(user.id, groupId, String(formData.get("content") ?? ""));
  if (directedTo && directedKind === "agent") askGroupMember(user.id, groupId, directedTo);
  revalidatePath(`/conversations/group/${groupId}`);
  redirect(`/conversations/group/${groupId}`);
}

/** Rule-based: each member agent posts a profile-derived response. No model calls. */
export async function askGroupAction(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  askGroup(user.id, groupId);
  revalidatePath(`/conversations/group/${groupId}`);
  redirect(`/conversations/group/${groupId}`);
}

/** Explicit LLM action (one call, rules fallback): summarize where the group stands. */
export async function summarizeGroupAction(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const view = getGroupView(user.id, groupId);
  if (view) {
    const { text, source } = await summarizeGroup({ goal: view.goal, transcript: groupTranscript(view) });
    console.log(`[llm] group summarize source=${source}`);
    postGroupSummary(groupId, text);
  }
  revalidatePath(`/conversations/group/${groupId}`);
  redirect(`/conversations/group/${groupId}`);
}

export async function proposeGroupActionAction(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  proposeGroupAction({
    userId: user.id,
    groupId,
    action: String(formData.get("action") ?? ""),
    shares: String(formData.get("shares") ?? ""),
  });
  revalidatePath(`/conversations/group/${groupId}`);
  redirect(`/conversations/group/${groupId}`);
}

export async function decideGroupProposalAction(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  decideGroupProposal({
    userId: user.id,
    proposalId: String(formData.get("proposalId") ?? ""),
    decision: String(formData.get("decision") ?? "approved") === "rejected" ? "rejected" : "approved",
  });
  revalidatePath(`/conversations/group/${groupId}`);
  redirect(`/conversations/group/${groupId}`);
}

export async function saveInboundPolicyAction(formData: FormData) {
  const user = await requireUser();
  const v = String(formData.get("inbound_policy") ?? "open");
  const policy = v === "contacts" ? "contacts" : v === "approval" ? "approval" : "open";
  setInboundPolicy(user.id, policy);
  revalidatePath("/settings");
  redirect("/settings");
}
