import { authenticate, jsonError } from "@/lib/api-helpers";
import { listIntros, requestIntro, reportFor, waitingOn, type IntroView } from "@/lib/intros";

function serializeIntro(intro: IntroView, viewerId: string) {
  return {
    intro_id: intro.id,
    with:
      intro.initiator_user_id === viewerId
        ? `${intro.target_name} (@${intro.target_handle})`
        : `${intro.initiator_name} (@${intro.initiator_handle})`,
    initiated_by_you: intro.initiator_user_id === viewerId,
    status: intro.status,
    waiting_on_you: waitingOn(intro, viewerId),
    match_score: intro.match_score,
    report: reportFor(intro, viewerId),
    session_id: intro.session_id,
    checkpoint_id:
      intro.status === "awaiting_initiator_approval"
        ? intro.initiator_checkpoint_id
        : intro.status === "awaiting_target_approval"
          ? intro.target_checkpoint_id
          : null,
    updated_at: intro.updated_at,
  };
}

export async function GET(request: Request) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    return Response.json({ intros: listIntros(auth.id).map((i) => serializeIntro(i, auth.id)) });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const body = await request.json();
    const to = String(body.to ?? "");
    if (!to.trim()) throw new Error("'to' is required (handle, email, or user id).");
    const missionId = String(body.mission_id ?? "").trim();
    const intro = requestIntro(auth.id, to, missionId ? { missionId } : {});
    return Response.json({ intro: serializeIntro(intro, auth.id) });
  } catch (err) {
    return jsonError(err);
  }
}
