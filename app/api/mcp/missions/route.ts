import { authenticate, jsonError, serializeMission } from "@/lib/api-helpers";
import { createMissionDraft, listMissions } from "@/lib/missions";

export async function GET(request: Request) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    return Response.json({ missions: listMissions(auth.id).map(serializeMission) });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const body = await request.json();
    const mission = await createMissionDraft(auth.id, String(body.request ?? ""));
    return Response.json({
      mission: serializeMission(mission),
      note:
        "This is a DRAFT awaiting the owner's approval — no outreach has happened. " +
        "Review it with the owner, then approve_mission with the chosen targets (or cancel_mission).",
    });
  } catch (err) {
    return jsonError(err);
  }
}
