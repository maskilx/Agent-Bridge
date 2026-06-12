import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { appUrl, exchangeGoogleCode } from "@/lib/google";
import { createUser, getUserByEmail, getUserByGoogleSub, linkGoogleAccount } from "@/lib/core";
import { allowedEmail } from "@/lib/access";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get("ab_oauth_state")?.value;
  store.delete("ab_oauth_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${appUrl()}/login?error=oauth_state`);
  }

  try {
    const profile = await exchangeGoogleCode(code);
    if (!allowedEmail(profile.email)) {
      return NextResponse.redirect(`${appUrl()}/login?error=not_invited`);
    }

    let user = getUserByGoogleSub(profile.sub);
    if (!user) {
      const byEmail = getUserByEmail(profile.email);
      if (byEmail) {
        linkGoogleAccount(byEmail.id, profile.sub, profile.picture);
        user = { ...byEmail, google_sub: profile.sub, picture: profile.picture };
      } else {
        user = createUser({
          name: profile.name,
          email: profile.email,
          googleSub: profile.sub,
          picture: profile.picture,
        });
      }
    }

    await setSession(user.api_token);
    return NextResponse.redirect(`${appUrl()}${user.onboarded ? "/dashboard" : "/agent?setup=1"}`);
  } catch (err) {
    console.error("Google sign-in failed:", err);
    return NextResponse.redirect(`${appUrl()}/login?error=google_failed`);
  }
}
