"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_EMAIL, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type UserActionResult = { success: boolean; error?: string };

// Deliberately permissive but structural: catches typos like "bob@" or a bare
// name pasted into the field, without trying to out-guess Google on what a
// valid address looks like.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function listUsers() {
  await requireAdmin();
  return prisma.allowedUser.findMany({ orderBy: { createdAt: "asc" } });
}

export async function addUser(formData: FormData): Promise<UserActionResult> {
  const admin = await requireAdmin();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "user") === "admin"
    ? "admin"
    : "user";

  if (!EMAIL_PATTERN.test(email)) {
    return { success: false, error: "Enter a valid email address." };
  }

  if (email === ADMIN_EMAIL) {
    return {
      success: false,
      error: "That address is the built-in admin and always has access.",
    };
  }

  const existing = await prisma.allowedUser.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "That email already has access." };
  }

  await prisma.allowedUser.create({
    data: { email, role, addedBy: admin.email },
  });

  revalidatePath("/users");
  return { success: true };
}

export async function removeUser(id: string): Promise<UserActionResult> {
  const admin = await requireAdmin();

  const user = await prisma.allowedUser.findUnique({ where: { id } });
  if (!user) return { success: false, error: "User not found." };

  // Removing yourself would drop your own admin rights mid-session.
  if (user.email === admin.email) {
    return { success: false, error: "You can't remove your own access." };
  }

  await prisma.allowedUser.delete({ where: { id } });

  revalidatePath("/users");
  return { success: true };
}

export async function setUserRole(
  id: string,
  role: "admin" | "user",
): Promise<UserActionResult> {
  const admin = await requireAdmin();

  const user = await prisma.allowedUser.findUnique({ where: { id } });
  if (!user) return { success: false, error: "User not found." };

  if (user.email === admin.email) {
    return { success: false, error: "You can't change your own role." };
  }

  await prisma.allowedUser.update({ where: { id }, data: { role } });

  revalidatePath("/users");
  return { success: true };
}
