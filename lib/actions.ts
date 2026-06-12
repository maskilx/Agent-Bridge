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
  updateAgent,
} from "./core";
import { completeSession, decideProposal, sendSessionMessage, startSession } from "./sessions";
import { decideIntro, requestIntro, syncIntros } from "./intros";
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
  const intro = requestIntro(user.id, String(formData.get("targetUserId") ?? ""));
  revalidatePath("/intros");
  redirect(`/intros/${intro.id}`);
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
