"use server";

import { cookies } from "next/headers";

const SITE_PASSWORD = "BrianaBTC2026";
const COOKIE_NAME = "ct-auth";
const COOKIE_VALUE = "authenticated";

export async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value === COOKIE_VALUE;
}

export async function login(formData: FormData): Promise<{ error?: string }> {
  const password = formData.get("password") as string;
  if (password !== SITE_PASSWORD) {
    return { error: "Wrong password" };
  }
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90, // 90 days
  });
  return {};
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
