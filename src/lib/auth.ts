import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";

// This email always has admin access and cannot be removed from the allowlist.
export const ADMIN_EMAIL = "brianas@behindthechair.com";

export const SESSION_COOKIE = "ct-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type Session = {
  email: string;
  name: string | null;
  picture: string | null;
  role: "admin" | "user";
};

type SessionPayload = Session & { exp: number };

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error(
      "AUTH_SECRET is not set. Generate one with: openssl rand -hex 32",
    );
  }
  return value;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

// Compares two strings without leaking timing information about where they
// first differ, which is what makes signature forgery impractical.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function encodeSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!safeEqual(signature, sign(body))) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString(),
    ) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Look up an email against the allowlist. The hardcoded admin always passes;
 * everyone else must have a row in AllowedUser.
 */
export async function resolveAccess(
  email: string,
): Promise<{ allowed: boolean; role: "admin" | "user" }> {
  const normalized = email.trim().toLowerCase();

  if (normalized === ADMIN_EMAIL) {
    return { allowed: true, role: "admin" };
  }

  const user = await prisma.allowedUser.findUnique({
    where: { email: normalized },
  });
  if (!user) return { allowed: false, role: "user" };

  return { allowed: true, role: user.role === "admin" ? "admin" : "user" };
}

export async function createSession(user: {
  email: string;
  name: string | null;
  picture: string | null;
  role: "admin" | "user";
}): Promise<void> {
  const token = encodeSession({
    ...user,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * The single source of truth for "who is calling". Re-checks the allowlist on
 * every call rather than trusting the cookie's role, so revoking a user takes
 * effect on their next request instead of when their session happens to expire.
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = decodeSession(token);
  if (!payload) return null;

  const access = await resolveAccess(payload.email);
  if (!access.allowed) return null;

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    role: access.role,
  };
}

/**
 * Guard for anything that reads or writes app data. Server Actions are
 * reachable as direct POST endpoints regardless of what the UI renders, so
 * every one of them has to call this itself.
 *
 * Redirects rather than throws: a signed-out caller gets sent to the login
 * screen instead of a 500. Either way the caller is stopped before any data is
 * read, since redirect() aborts the request.
 */
export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireUser();
  // Signed in, but not an admin: send them somewhere they're allowed to be
  // rather than dead-ending on an error page.
  if (session.role !== "admin") redirect("/");
  return session;
}
