import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_EMAIL, createSession, resolveAccess } from "@/lib/auth";
import { OAUTH_STATE_COOKIE, exchangeCodeForProfile } from "@/lib/google-oauth";
import { prisma } from "@/lib/db";

function failure(request: NextRequest, error: string) {
  const url = new URL("/login", request.nextUrl.origin);
  url.searchParams.set("error", error);
  const response = NextResponse.redirect(url);
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  // The user hit "Cancel" on Google's consent screen, or the request was not
  // one we started.
  if (!code || !state || !expectedState || state !== expectedState) {
    return failure(request, "failed");
  }

  const profile = await exchangeCodeForProfile(request, code);
  if (!profile) return failure(request, "failed");

  // An unverified Google address proves nothing about who owns it, so it must
  // not be able to match an allowlist entry.
  if (!profile.emailVerified) return failure(request, "unverified");

  const access = await resolveAccess(profile.email);
  if (!access.allowed) return failure(request, "denied");

  if (profile.email !== ADMIN_EMAIL) {
    await prisma.allowedUser.update({
      where: { email: profile.email },
      data: { lastLoginAt: new Date(), name: profile.name },
    });
  }

  await createSession({
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    role: access.role,
  });

  const response = NextResponse.redirect(new URL("/", request.nextUrl.origin));
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}
