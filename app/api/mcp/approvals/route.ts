import { authenticate, jsonError, serializeCheckpoint } from "@/lib/api-helpers";
import { listPendingApprovals } from "@/lib/sessions";

export async function GET(request: Request) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    return Response.json({
      pending_approvals: listPendingApprovals(auth.id).map(serializeCheckpoint),
    });
  } catch (err) {
    return jsonError(err);
  }
}
