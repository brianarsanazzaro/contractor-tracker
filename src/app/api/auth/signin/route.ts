import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { OAUTH_STATE_COOKIE, googleAuthUrl } from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  // A random value echoed back by Google on the callback. It proves the
  // callback was triggered by a sign-in we started, not by a link someone
  // else crafted (CSRF).
  const state = crypto.randomBytes(16).toString("hex");

  const response = NextResponse.redirect(googleAuthUrl(request, state));
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes to complete the sign-in
  });

  return response;
}
