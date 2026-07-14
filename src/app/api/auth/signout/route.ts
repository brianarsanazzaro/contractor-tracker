import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin), {
    // A POST must answer with 303 so the browser follows it as a GET.
    status: 303,
  });
}
