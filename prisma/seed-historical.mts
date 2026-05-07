import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

// Historical data extracted from the Google Sheet PDF (2026 YTD)
// January 2026: 2 pay periods (processed 1/14 and 1/28)

async function main() {
  // Get contractors and categories
  const contractors = await prisma.contractor.findMany();
  const categories = await prisma.projectCategory.findMany();

  const byName = (name: string) => {
    const c = contractors.find((c) => c.name === name);
    if (!c) throw new Error(`Contractor not found: ${name}`);
    return c;
  };
  const byCat = (name: string) => {
    const c = categories.find((c) => c.name === name);
    if (!c) throw new Error(`Category not found: ${name}`);
    return c;
  };

  // Clear existing pay periods to avoid duplicates on re-run
  await prisma.timeEntry.deleteMany({});
  await prisma.payPeriod.deleteMany({});

  // ============================================================
  // PAY PERIOD 1: Processed 1/14/2026 (first half of January)
  // ============================================================

  const period1Data = [
    {
      contractor: "MD. Pranto Hassan",
      rate: 15,
      entries: [
        { cat: "BTC [Dev]", amount: 605.93 },
        { cat: "BTC-U [Dev]", amount: 194.16 },
        { cat: "BTC Events (#oneshot) [Dev]", amount: 228.95 },
        { cat: "WDYH [Dev]", amount: 100.64 },
        { cat: "ARC [Dev]", amount: 37.83 },
      ],
    },
    {
      contractor: "Mangat Singh",
      rate: 27,
      entries: [
        { cat: "BTC [Dev]", amount: 773.67 },
        { cat: "BTC Events (#oneshot) [Dev]", amount: 1089.53 },
        { cat: "BTC Events (btc show, on tour) [Dev]", amount: 14.65 },
      ],
    },
    {
      contractor: "Jaspreet Singh",
      rate: 20,
      entries: [
        { cat: "BTC [Dev]", amount: 277.41 },
        { cat: "BTC Events (#oneshot) [Dev]", amount: 321.03 },
        { cat: "WDYH [Dev]", amount: 353.89 },
      ],
    },
    {
      contractor: "Hamzah Syed",
      rate: 30,
      entries: [{ cat: "BTC-U [Dev]", amount: 268.50 }],
    },
    {
      contractor: "Peter Ward",
      rate: 30,
      entries: [{ cat: "HubSpot [Dev]", amount: 325.50 }],
    },
    {
      contractor: "Hardeep Singh",
      rate: 22,
      entries: [
        { cat: "BTC [Dev]", amount: 1159.44 },
        { cat: "BTC-U [Dev]", amount: 40.18 },
        { cat: "ARC [Dev]", amount: 235.51 },
      ],
    },
    {
      contractor: "Sahil Dubey",
      rate: 30,
      entries: [{ cat: "Cloud Architect & Security [Dev]", amount: 166.25 }],
    },
  ];

  // ============================================================
  // PAY PERIOD 2: Processed 1/28/2026 (second half of January)
  // ============================================================

  const period2Data = [
    {
      contractor: "MD. Pranto Hassan",
      rate: 15,
      entries: [
        { cat: "BTC [Dev]", amount: 235.03 },
        { cat: "BTC-U [Dev]", amount: 309.88 },
        { cat: "BTC Events (#oneshot) [Dev]", amount: 645.09 },
      ],
    },
    {
      contractor: "Mangat Singh",
      rate: 27,
      entries: [
        { cat: "BTC [Dev]", amount: 254.11 },
        { cat: "BTC Events (#oneshot) [Dev]", amount: 1650.74 },
      ],
    },
    {
      contractor: "Jaspreet Singh",
      rate: 20,
      entries: [
        { cat: "BTC [Dev]", amount: 625.66 },
        { cat: "BTC-U [Dev]", amount: 308.64 },
        { cat: "ARC [Dev]", amount: 89.03 },
      ],
    },
    {
      contractor: "Hamzah Syed",
      rate: 30,
      entries: [{ cat: "BTC-U [Dev]", amount: 648.00 }],
    },
    {
      contractor: "Peter Ward",
      rate: 30,
      entries: [{ cat: "HubSpot [Dev]", amount: 482.50 }],
    },
    {
      contractor: "Hardeep Singh",
      rate: 22,
      entries: [
        { cat: "BTC [Dev]", amount: 1292.07 },
        { cat: "BTC-U [Dev]", amount: 174.73 },
        { cat: "BTC Events (#oneshot) [Dev]", amount: 39.44 },
        { cat: "ARC [Dev]", amount: 96.83 },
      ],
    },
    {
      contractor: "Sahil Dubey",
      rate: 30,
      entries: [{ cat: "Cloud Architect & Security [Dev]", amount: 169.17 }],
    },
  ];

  async function createPayPeriod(
    data: typeof period1Data,
    startDate: string,
    endDate: string,
    processingDate: string,
  ) {
    for (const item of data) {
      const contractor = byName(item.contractor);
      const totalAmount = item.entries.reduce((s, e) => s + e.amount, 0);
      const totalHours = parseFloat((totalAmount / item.rate).toFixed(2));

      const pp = await prisma.payPeriod.create({
        data: {
          contractorId: contractor.id,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          processingDate: new Date(processingDate),
          month: "January",
          year: 2026,
          totalHours,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          source: "manual",
        },
      });

      for (const entry of item.entries) {
        const cat = byCat(entry.cat);
        await prisma.timeEntry.create({
          data: {
            payPeriodId: pp.id,
            projectCategoryId: cat.id,
            description: `${entry.cat.replace(" [Dev]", "")} work`,
            hoursDecimal: parseFloat((entry.amount / item.rate).toFixed(2)),
            amount: entry.amount,
          },
        });
      }

      console.log(
        `  ${contractor.name}: $${totalAmount.toFixed(2)} (${totalHours}h) - ${item.entries.length} entries`,
      );
    }
  }

  console.log("Seeding Pay Period 1 (processed 1/14/2026)...");
  await createPayPeriod(
    period1Data,
    "2026-01-01",
    "2026-01-13",
    "2026-01-14",
  );

  console.log("\nSeeding Pay Period 2 (processed 1/28/2026)...");
  await createPayPeriod(
    period2Data,
    "2026-01-14",
    "2026-01-27",
    "2026-01-28",
  );

  // Verify totals
  const allEntries = await prisma.timeEntry.findMany();
  const grandTotal = allEntries.reduce((s, e) => s + e.amount, 0);
  console.log(`\nGrand total seeded: $${grandTotal.toFixed(2)}`);
  console.log("Expected from Google Sheet: $13,214.00");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
