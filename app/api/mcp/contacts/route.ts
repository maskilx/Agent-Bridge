import { authenticate, jsonError } from "@/lib/api-helpers";
import { createContact } from "@/lib/core";

export async function POST(request: Request) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const body = await request.json();
    if (!body.name) throw new Error("'name' is required.");
    const contact = createContact({
      ownerUserId: auth.id,
      name: String(body.name),
      email: body.email ? String(body.email) : undefined,
      handle: body.handle ? String(body.handle) : undefined,
      relationship: body.relationship ? String(body.relationship) : undefined,
    });
    return Response.json(
      {
        contact: {
          name: contact.name,
          email: contact.email,
          handle: contact.handle ? `@${contact.handle}` : "",
          linked_to_registered_user: Boolean(contact.linked_user_id),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return jsonError(err);
  }
}
