import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const projectCategories = [
  { name: "HubSpot [Dev]", clockifyProject: null, clockifyClient: "HubSpot", sortOrder: 1, isDev: true },
  { name: "BTC [Dev]", clockifyProject: "behindthechair.com", clockifyClient: "BTC", sortOrder: 2, isDev: true },
  { name: "BTC-U [Dev]", clockifyProject: null, clockifyClient: "BTC-U", sortOrder: 3, isDev: true },
  { name: "BTC Events (#oneshot) [Dev]", clockifyProject: "oneshot.behindthechair.com", clockifyClient: "BTC Events", sortOrder: 4, isDev: true },
  { name: "BTC Events (btc show, on tour) [Dev]", clockifyProject: null, clockifyClient: "BTC Events Tour", sortOrder: 5, isDev: true },
  { name: "WDYH [Dev]", clockifyProject: null, clockifyClient: "WDYH", sortOrder: 6, isDev: true },
  { name: "ARC [Dev]", clockifyProject: null, clockifyClient: "ARC", sortOrder: 7, isDev: true },
  { name: "Cloud Architect & Security [Dev]", clockifyProject: null, clockifyClient: null, sortOrder: 8, isDev: true },
  { name: "WDYH [Design]", clockifyProject: null, clockifyClient: null, sortOrder: 9, isDev: false },
  { name: "Other 1-off Design/Data Entry", clockifyProject: null, clockifyClient: null, sortOrder: 10, isDev: false },
];

const contractors = [
  { name: "Hardeep Singh", hourlyRate: 22.0, jobTitle: "Full stack developer (WordPress)", isActive: true, startDate: "April 16, 2024", terminationDate: null },
  { name: "Hamzah Syed", hourlyRate: 30.0, jobTitle: "BTC-U developer", isActive: true, startDate: "Jun 26, 2023", terminationDate: null },
  { name: "Jaspreet Singh", hourlyRate: 20.0, jobTitle: "Full stack developer (WordPress)", isActive: true, startDate: "Sept 23, 2024", terminationDate: null },
  { name: "Mangat Singh", hourlyRate: 29.0, jobTitle: "Full stack developer (WordPress)", isActive: true, startDate: "March 9, 2024", terminationDate: null },
  { name: "MD. Pranto Hassan", hourlyRate: 15.0, jobTitle: "Website tester", isActive: true, startDate: "Dec 4, 2023", terminationDate: null },
  { name: "Peter Ward", hourlyRate: 30.0, jobTitle: "HubSpot specialist", isActive: false, startDate: "Feb 2025", terminationDate: "2/6/2026" },
  { name: "Sahil Dubey", hourlyRate: 35.0, jobTitle: "AWS Infrastructure Optimization & Support", isActive: true, startDate: null, terminationDate: null },
];

async function main() {
  console.log("Seeding project categories...");
  for (const cat of projectCategories) {
    await prisma.projectCategory.upsert({
      where: { name: cat.name },
      update: cat,
      create: cat,
    });
  }

  console.log("Seeding contractors...");
  for (const c of contractors) {
    const existing = await prisma.contractor.findFirst({ where: { name: c.name } });
    if (existing) {
      await prisma.contractor.update({
        where: { id: existing.id },
        data: c,
      });
    } else {
      await prisma.contractor.create({ data: c });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
