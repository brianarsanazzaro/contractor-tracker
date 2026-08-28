import { NextResponse } from "next/server";
import { ADMIN_EMAIL, createSession } from "@/lib/auth";

/**
 * Local-only shortcut: signs you in as the admin without going through Google.
 * Exists so development doesn't require an OAuth client. It is a 404 in
 * production, so it can never be reached on the deployed site.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  await createSession({
    email: ADMIN_EMAIL,
    name: "Local admin",
    picture: null,
    role: "admin",
  });

  return NextResponse.redirect(
    new URL("/", process.env.APP_URL ?? "http://localhost:3000"),
  );
}
