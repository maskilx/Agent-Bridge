import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserByToken, type User } from "./core";
import { emailMayUseApp } from "./access";

const SESSION_COOKIE = "ab_session";

export async function currentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = getUserByToken(token) ?? null;
  // Second-layer allowlist: revoking an email from ALLOWED_EMAILS ends existing sessions too.
  if (user && !emailMayUseApp(user.email)) return null;
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function setSession(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Resolve the user for an MCP/API request from its Authorization: Bearer token. */
export function userFromBearer(request: Request): User | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return getUserByToken(match[1].trim()) ?? null;
}
