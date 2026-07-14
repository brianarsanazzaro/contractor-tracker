"use server";

import { requireUser } from "@/lib/auth";
import { isSafeHttpUrl } from "@/lib/safe-url";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Today as "YYYY-MM-DD" in local time
function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

export async function getAccessOverview() {
  await requireUser();
  const accounts = await prisma.sharedAccount.findMany({
    orderBy: { name: "asc" },
    include: {
      access: {
        include: { contractor: { select: { id: true, name: true, isActive: true } } },
        orderBy: { grantedDate: "asc" },
      },
    },
  });

  const contractors = await prisma.contractor.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: { id: true, name: true, isActive: true },
  });

  return { accounts, contractors };
}

export async function addSharedAccount(formData: FormData): Promise<void> {
  await requireUser();
  const name = (formData.get("name") as string)?.trim();
  const username = (formData.get("username") as string)?.trim() || null;
  const url = (formData.get("url") as string)?.trim() || null;
  const note = (formData.get("note") as string)?.trim() || null;

  if (!name) return;

  // Reject anything that isn't http(s) rather than storing it: this value ends
  // up in an href on /access.
  if (url && !isSafeHttpUrl(url)) return;

  const existing = await prisma.sharedAccount.findUnique({ where: { name } });
  if (existing) return;

  await prisma.sharedAccount.create({ data: { name, username, url, note } });
  revalidatePath("/access");
}

export async function deleteSharedAccount(formData: FormData): Promise<void> {
  await requireUser();
  const id = formData.get("id") as string;
  if (!id) return;
  await prisma.sharedAccount.delete({ where: { id } });
  revalidatePath("/access");
}

export async function grantAccess(formData: FormData): Promise<void> {
  await requireUser();
  const accountId = formData.get("accountId") as string;
  const contractorId = formData.get("contractorId") as string;
  const grantedDate = (formData.get("grantedDate") as string) || todayStr();
  const note = (formData.get("note") as string)?.trim() || null;

  if (!accountId || !contractorId) return;

  // Don't create a second active grant for the same contractor + account
  const active = await prisma.accountAccess.findFirst({
    where: { accountId, contractorId, revokedDate: null },
  });
  if (active) return;

  await prisma.accountAccess.create({
    data: { accountId, contractorId, grantedDate, note },
  });
  revalidatePath("/access");
}

export async function revokeAccess(formData: FormData): Promise<void> {
  await requireUser();
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.accountAccess.update({
    where: { id },
    data: { revokedDate: todayStr() },
  });
  revalidatePath("/access");
}

// Offboarding: mark every active grant for a contractor as revoked.
// This is the "I just changed all their passwords" button.
export async function revokeAllForContractor(formData: FormData): Promise<void> {
  await requireUser();
  const contractorId = formData.get("contractorId") as string;
  if (!contractorId) return;

  await prisma.accountAccess.updateMany({
    where: { contractorId, revokedDate: null },
    data: { revokedDate: todayStr() },
  });
  revalidatePath("/access");
}
