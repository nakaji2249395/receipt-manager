import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getGoogleAuthorizationUrl } from "@/lib/google";
import { getSession } from "@/lib/session";

const STATE_COOKIE = "google_oauth_state";

export async function GET(request: Request) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const state = randomBytes(32).toString("base64url");
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI
    || new URL("/api/google/callback", request.url).toString();
  const response = NextResponse.redirect(getGoogleAuthorizationUrl(redirectUri, state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
