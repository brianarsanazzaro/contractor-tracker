import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

// Pay history extracted from the contractor CSV "pay increases" column

const payHistory: Record<string, { type: string; date: string; amount: number; previousRate?: number; note?: string }[]> = {
  "Hardeep Singh": [
    { type: "raise", date: "4/16/2024", amount: 20, note: "Upwork start" },
    { type: "raise", date: "6/18/2024", amount: 20, previousRate: 20, note: "Switched to direct pay" },
    { type: "raise", date: "4/15/2025", amount: 22, previousRate: 20, note: "Raise" },
    { type: "bonus", date: "12/31/2025", amount: 400, note: "Year-end bonus" },
  ],
  "Hamzah Syed": [
    { type: "raise", date: "6/26/2023", amount: 30, note: "Upwork start" },
    { type: "raise", date: "5/17/2024", amount: 30, previousRate: 30, note: "Switched to Gusto" },
    { type: "bonus", date: "12/31/2025", amount: 100, note: "Year-end bonus" },
  ],
  "Jaspreet Singh": [
    { type: "raise", date: "9/23/2024", amount: 20, note: "Gusto start" },
    { type: "bonus", date: "12/31/2025", amount: 150, note: "Year-end bonus" },
  ],
  "Mangat Singh": [
    { type: "raise", date: "3/9/2024", amount: 20, note: "Upwork start" },
    { type: "raise", date: "6/18/2024", amount: 20, previousRate: 20, note: "Switched to direct pay" },
    { type: "raise", date: "7/31/2024", amount: 23, previousRate: 20, note: "Raise" },
    { type: "raise", date: "3/6/2025", amount: 25, previousRate: 23, note: "Raise" },
    { type: "bonus", date: "7/30/2025", amount: 50, note: "Mid-year bonus" },
    { type: "raise", date: "11/5/2025", amount: 27, previousRate: 25, note: "Raise" },
    { type: "bonus", date: "12/31/2025", amount: 750, note: "Year-end bonus" },
    { type: "raise", date: "3/9/2026", amount: 29, previousRate: 27, note: "Raise" },
  ],
  "MD. Pranto Hassan": [
    { type: "raise", date: "12/4/2023", amount: 12, note: "Upwork start" },
    { type: "raise", date: "5/28/2024", amount: 13, previousRate: 12, note: "Switched to Gusto" },
    { type: "raise", date: "12/6/2024", amount: 14, previousRate: 13, note: "Raise" },
    { type: "raise", date: "12/2/2025", amount: 15, previousRate: 14, note: "Raise" },
    { type: "bonus", date: "12/31/2025", amount: 150, note: "Year-end bonus" },
  ],
  "Peter Ward": [
    { type: "raise", date: "2/1/2025", amount: 30, note: "Upwork start" },
    { type: "raise", date: "4/22/2025", amount: 30, previousRate: 30, note: "Switched to Gusto" },
  ],
  "Sahil Dubey": [
    { type: "raise", date: "2025-01-01", amount: 35, note: "Starting rate" },
  ],
};

async function main() {
  // Clear existing pay history
  await prisma.payHistory.deleteMany({});

  const contractors = await prisma.contractor.findMany();

  for (const [name, history] of Object.entries(payHistory)) {
    const contractor = contractors.find((c) => c.name === name);
    if (!contractor) {
      console.log(`Skipping ${name} - not found`);
      continue;
    }

    for (const entry of history) {
      await prisma.payHistory.create({
        data: {
          contractorId: contractor.id,
          type: entry.type,
          date: entry.date,
          amount: entry.amount,
          previousRate: entry.previousRate || null,
          note: entry.note || null,
        },
      });
    }

    console.log(`${name}: ${history.length} entries`);
  }

  console.log("Pay history seeded.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
