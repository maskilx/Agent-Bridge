import { authenticate, jsonError, serializeRequest } from "@/lib/api-helpers";
import { replyToRequest } from "@/lib/core";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const approvalStatus = String(body.approval_status ?? "approved");
    if (!["approved", "edited", "rejected"].includes(approvalStatus))
      throw new Error("approval_status must be one of: approved, edited, rejected.");
    const req = replyToRequest({
      responderUserId: auth.id,
      requestId: id,
      replyText: String(body.reply_text ?? ""),
      approvalStatus: approvalStatus as "approved" | "edited" | "rejected",
    });
    return Response.json({ request: serializeRequest(req) });
  } catch (err) {
    return jsonError(err);
  }
}
