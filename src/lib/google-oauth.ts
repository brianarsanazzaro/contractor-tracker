import "server-only";

import type { NextRequest } from "next/server";

export const OAUTH_STATE_COOKIE = "ct-oauth-state";

export type GoogleProfile = {
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

function clientId(): string {
  const value = process.env.GOOGLE_CLIENT_ID;
  if (!value) throw new Error("GOOGLE_CLIENT_ID is not set");
  return value;
}

function clientSecret(): string {
  const value = process.env.GOOGLE_CLIENT_SECRET;
  if (!value) throw new Error("GOOGLE_CLIENT_SECRET is not set");
  return value;
}

/**
 * Must match a redirect URI registered on the Google OAuth client exactly.
 * APP_URL pins it in production, where a proxy may rewrite the request origin.
 */
export function redirectUri(request: NextRequest): string {
  const base = process.env.APP_URL ?? request.nextUrl.origin;
  return new URL("/api/auth/callback", base).toString();
}

export function googleAuthUrl(request: NextRequest, state: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("redirect_uri", redirectUri(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

/**
 * Trades the one-time code for the user's identity.
 *
 * The ID token comes straight from Google's token endpoint over TLS with our
 * client secret, so its payload is trustworthy as-is and does not need separate
 * signature verification (that would only be required for a token handed to us
 * by the browser).
 */
export async function exchangeCodeForProfile(
  request: NextRequest,
  code: string,
): Promise<GoogleProfile | null> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri(request),
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { id_token?: string };
  if (!data.id_token) return null;

  const [, payload] = data.id_token.split(".");
  if (!payload) return null;

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as {
      email?: string;
      email_verified?: boolean | string;
      name?: string;
      picture?: string;
    };

    if (!claims.email) return null;

    return {
      email: claims.email.trim().toLowerCase(),
      // Google sends this as a boolean, but older clients have seen the string
      // form, so accept both rather than silently treating "true" as unverified.
      emailVerified:
        claims.email_verified === true || claims.email_verified === "true",
      name: claims.name ?? null,
      picture: claims.picture ?? null,
    };
  } catch {
    return null;
  }
}
