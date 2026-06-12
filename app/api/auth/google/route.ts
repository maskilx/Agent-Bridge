import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleAuthUrl, googleConfigured, newOauthState } from "@/lib/google";

export async function GET() {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", process.env.APP_URL ?? "http://localhost:3001"));
  }
  const state = newOauthState();
  const store = await cookies();
  store.set("ab_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return NextResponse.redirect(googleAuthUrl(state));
}
