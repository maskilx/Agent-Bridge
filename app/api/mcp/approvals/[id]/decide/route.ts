import { authenticate, clientVia, jsonError, serializeCheckpoint } from "@/lib/api-helpers";
import { decideProposal, getCheckpoint } from "@/lib/sessions";
import { syncIntros } from "@/lib/intros";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const decision = String(body.decision ?? "");
    if (!["approved", "rejected"].includes(decision))
      throw new Error("decision must be 'approved' or 'rejected'.");
    decideProposal(
      auth.id,
      Number(id),
      decision as "approved" | "rejected",
      body.note ? String(body.note) : "",
      clientVia(request),
      body.edited_text ? String(body.edited_text) : undefined
    );
    syncIntros(); // the checkpoint may belong to an introduction flow
    return Response.json({ checkpoint: serializeCheckpoint(getCheckpoint(auth.id, Number(id))) });
  } catch (err) {
    return jsonError(err);
  }
}
