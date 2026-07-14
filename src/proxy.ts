import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

// Public paths. Everything else requires a session.
// robots.txt has to stay reachable while signed out: a crawler that gets
// redirected to /login never reads the Disallow rule, and an unreachable
// robots.txt is treated as "crawl anything".
const PUBLIC_PATHS = [
  "/login",
  "/robots.txt",
  "/api/auth/signin",
  "/api/auth/callback",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  // Presence of the cookie only — this is an optimistic redirect to keep
  // signed-out visitors off the app shell. The signature and the allowlist are
  // verified for real in getSession()/requireUser(), which every page and
  // Server Action calls.
  const hasSession = request.cookies.has(SESSION_COOKIE);

  const response =
    !isPublic && !hasSession
      ? NextResponse.redirect(new URL("/login", request.nextUrl.origin))
      : NextResponse.next();

  // Belt and braces with app/robots.ts and the layout's robots metadata. This
  // header is the one crawlers honour even for non-HTML responses, and it rides
  // along on redirects too.
  response.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet, noimageindex",
  );

  return response;
}

export const config = {
  // Skip Next's internals and static files; guard everything else.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
