"use server";

import { prisma } from "@/lib/db";
import { parseClockifyCsv } from "@/lib/parse-clockify";
import {
  parseGoogleSheetCsv,
  type SheetFormat,
} from "@/lib/parse-sheet-csv";

// Get the hourly rate a contractor was earning at a specific date,
// based on their raise history. Falls back to current rate if no history.
async function getRateAtDate(contractorId: string, date: Date): Promise<number> {
  const contractor = await prisma.contractor.findUnique({
    where: { id: contractorId },
    include: { payHistory: { where: { type: "raise" }, orderBy: { date: "asc" } } },
  });
  if (!contractor) return 0;
  if (contractor.payHistory.length === 0) return contractor.hourlyRate;

  // Walk through raises chronologically, find the last one on or before the date
  let rate = contractor.payHistory[0].previousRate || contractor.payHistory[0].amount;
  for (const raise of contractor.payHistory) {
    const raiseDate = new Date(raise.date);
    if (raiseDate <= date) {
      rate = raise.amount;
    } else {
      break;
    }
  }
  return rate;
}

export async function getContractors(includeInactive = false) {
  return prisma.contractor.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getAllContractors() {
  return prisma.contractor.findMany({
    orderBy: { name: "asc" },
    include: {
      payHistory: { orderBy: { date: "asc" } },
    },
  });
}

export async function getProjectCategories() {
  return prisma.projectCategory.findMany({ orderBy: { sortOrder: "asc" } });
}

// Format a Prisma/SQLite date as a local date string, avoiding timezone shift
function localDate(d: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const s = typeof d === "string" ? d : d.toISOString();
  const match = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return new Date(d).toLocaleDateString("en-US", opts);
  const local = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  return local.toLocaleDateString("en-US", opts || undefined);
}

// Pure function: compute rate at a date from a list of raises
function computeRateAtDate(
  raises: { date: string; amount: number; previousRate: number | null }[],
  currentRate: number,
  date: Date
): number {
  if (raises.length === 0) return currentRate;
  let rate = raises[0].previousRate || raises[0].amount;
  for (const raise of raises) {
    const raiseDate = new Date(raise.date);
    if (raiseDate <= date) {
      rate = raise.amount;
    } else {
      break;
    }
  }
  return rate;
}

export async function getDashboardData(year: number) {
  const categories = await prisma.projectCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });
  const contractors = await prisma.contractor.findMany({
    orderBy: { name: "asc" },
    include: {
      payHistory: {
        where: { type: "raise" },
        orderBy: { date: "asc" },
      },
    },
  });

  const payPeriods = await prisma.payPeriod.findMany({
    where: { year },
    include: {
      contractor: true,
      timeEntries: {
        include: { projectCategory: true },
      },
    },
    orderBy: [{ contractor: { name: "asc" } }, { processingDate: "asc" }],
  });

  // Build summary per contractor
  const contractorSummaries = contractors.map((contractor) => {
    const periods = payPeriods.filter(
      (p) => p.contractorId === contractor.id
    );
    const totalHours = periods.reduce((sum, p) => sum + p.totalHours, 0);
    const totalAmount = periods.reduce((sum, p) => sum + p.totalAmount, 0);

    // Breakdown by category
    const categoryBreakdown = categories.map((cat) => {
      const catAmount = periods.reduce((sum, p) => {
        return (
          sum +
          p.timeEntries
            .filter((e) => e.projectCategoryId === cat.id)
            .reduce((s, e) => s + e.amount, 0)
        );
      }, 0);
      const catHours = periods.reduce((sum, p) => {
        return (
          sum +
          p.timeEntries
            .filter((e) => e.projectCategoryId === cat.id)
            .reduce((s, e) => s + e.hoursDecimal, 0)
        );
      }, 0);
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        amount: catAmount,
        hours: catHours,
        percentage: totalAmount > 0 ? (catAmount / totalAmount) * 100 : 0,
      };
    });

    // Compute effective rate for each period based on raise history
    const raises = contractor.payHistory;
    const periodsWithRate = periods.map((p) => ({
      ...p,
      effectiveRate: computeRateAtDate(
        raises,
        contractor.hourlyRate,
        new Date(p.processingDate)
      ),
    }));

    return {
      contractor,
      totalHours,
      totalAmount,
      categoryBreakdown,
      periods: periodsWithRate,
    };
  });

  // Grand totals per category
  const categoryTotals = categories.map((cat) => {
    const total = contractorSummaries.reduce(
      (sum, cs) => {
        const catData = cs.categoryBreakdown.find(
          (cb) => cb.categoryId === cat.id
        );
        return {
          amount: sum.amount + (catData?.amount || 0),
          hours: sum.hours + (catData?.hours || 0),
        };
      },
      { amount: 0, hours: 0 }
    );
    return { categoryId: cat.id, categoryName: cat.name, ...total };
  });

  const grandTotal = contractorSummaries.reduce(
    (sum, cs) => ({
      hours: sum.hours + cs.totalHours,
      amount: sum.amount + cs.totalAmount,
    }),
    { hours: 0, amount: 0 }
  );

  return {
    categories,
    contractorSummaries,
    categoryTotals,
    grandTotal,
    payPeriods,
  };
}

export async function uploadClockifyCsv(formData: FormData) {
  const file = formData.get("file") as File;
  const contractorId = formData.get("contractorId") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const processingDate = formData.get("processingDate") as string;

  if (!file || !contractorId || !startDate || !endDate || !processingDate) {
    return { error: "All fields are required" };
  }

  const contractor = await prisma.contractor.findUnique({
    where: { id: contractorId },
  });
  if (!contractor) return { error: "Contractor not found" };

  // Check for duplicate: same contractor with overlapping date range
  const existing = await prisma.payPeriod.findFirst({
    where: {
      contractorId,
      startDate: { lte: new Date(endDate) },
      endDate: { gte: new Date(startDate) },
    },
  });
  if (existing) {
    const existStart = localDate(existing.startDate);
    const existEnd = localDate(existing.endDate);
    return {
      error: `Duplicate detected: ${contractor.name} already has a pay period overlapping this range (${existStart} — ${existEnd}, $${existing.totalAmount.toFixed(2)}). Delete it first if you want to re-upload.`,
    };
  }

  const csvText = await file.text();
  const parsed = parseClockifyCsv(
    csvText,
    contractor.name,
    startDate,
    endDate
  );

  // Get all project categories for mapping
  const categories = await prisma.projectCategory.findMany();

  // Determine month from start date
  const startDateObj = new Date(startDate);
  const month = startDateObj.toLocaleString("en-US", { month: "long" });
  const year = startDateObj.getFullYear();

  // Create pay period
  const payPeriod = await prisma.payPeriod.create({
    data: {
      contractorId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      processingDate: new Date(processingDate),
      month,
      year,
      totalHours: parsed.totalHours,
      totalAmount: parsed.totalAmount,
      source: "clockify",
    },
  });

  // Create time entries, mapping Clockify project/client to categories
  for (const row of parsed.rows) {
    // Try to match by clockifyProject first, then clockifyClient
    let category = categories.find(
      (c) =>
        c.clockifyProject &&
        c.clockifyProject.toLowerCase() === row.project.toLowerCase()
    );
    if (!category) {
      category = categories.find(
        (c) =>
          c.clockifyClient &&
          c.clockifyClient.toLowerCase() === row.client.toLowerCase()
      );
    }

    if (category) {
      await prisma.timeEntry.create({
        data: {
          payPeriodId: payPeriod.id,
          projectCategoryId: category.id,
          description: row.description,
          hoursDecimal: row.timeDecimal,
          amount: row.amountUsd,
        },
      });
    }
  }

  return { success: true, payPeriodId: payPeriod.id };
}

export async function addManualEntry(formData: FormData) {
  const contractorId = formData.get("contractorId") as string;
  const projectCategoryId = formData.get("projectCategoryId") as string;
  const startDate = formData.get("startDate") as string;
  const endDateRaw = formData.get("endDate") as string;
  const hoursRaw = formData.get("hours") as string;
  let amount = parseFloat(formData.get("amount") as string);
  const description = formData.get("description") as string;

  if (!contractorId || !projectCategoryId || !startDate) {
    return { error: "Contractor, project, date, and amount are required" };
  }

  // End date defaults to start date if not provided (single-day entry)
  const endDate = endDateRaw || startDate;
  // Processing date defaults to the day after end date
  const endDateObj = new Date(endDate + "T12:00:00");
  const procDate = new Date(endDateObj);
  procDate.setDate(procDate.getDate() + 1);

  // Hours are optional — parse or default to 0
  const hours = hoursRaw ? parseFloat(hoursRaw) || 0 : 0;

  // If amount is 0 or not provided but hours are, calculate from historical rate
  if ((!amount || amount === 0) && hours > 0) {
    const rate = await getRateAtDate(contractorId, new Date(startDate + "T12:00:00"));
    amount = Math.round(hours * rate * 100) / 100;
  }

  const startDateObj = new Date(startDate + "T12:00:00");
  const month = startDateObj.toLocaleString("en-US", { month: "long" });
  const year = startDateObj.getFullYear();

  const payPeriod = await prisma.payPeriod.create({
    data: {
      contractorId,
      startDate: startDateObj,
      endDate: new Date(endDate + "T12:00:00"),
      processingDate: procDate,
      month,
      year,
      totalHours: hours,
      totalAmount: amount,
      source: "manual",
    },
  });

  await prisma.timeEntry.create({
    data: {
      payPeriodId: payPeriod.id,
      projectCategoryId,
      description: description || "Manual entry",
      hoursDecimal: hours,
      amount,
    },
  });

  return { success: true, payPeriodId: payPeriod.id };
}

// Get the rate for a contractor at a given date (for client-side preview)
export async function getContractorRateAtDate(contractorId: string, dateStr: string) {
  const rate = await getRateAtDate(contractorId, new Date(dateStr));
  return rate;
}

export async function addContractor(formData: FormData) {
  const name = formData.get("name") as string;
  const hourlyRate = parseFloat(formData.get("hourlyRate") as string);
  const jobTitle = formData.get("jobTitle") as string;

  if (!name || !hourlyRate || !jobTitle) {
    return { error: "All fields are required" };
  }

  await prisma.contractor.create({
    data: { name, hourlyRate, jobTitle },
  });

  return { success: true };
}

export async function getYearSummaries() {
  const categories = await prisma.projectCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const allEntries = await prisma.timeEntry.findMany({
    include: {
      payPeriod: true,
      projectCategory: true,
    },
  });

  // Group by year
  const yearMap = new Map<
    number,
    { dev: number; design: number; byCategory: Record<string, number> }
  >();

  for (const entry of allEntries) {
    const year = entry.payPeriod.year;
    if (!yearMap.has(year)) {
      yearMap.set(year, { dev: 0, design: 0, byCategory: {} });
    }
    const data = yearMap.get(year)!;
    const cat = categories.find((c) => c.id === entry.projectCategoryId);
    if (!cat) continue;

    if (cat.isDev) {
      data.dev += entry.amount;
    } else {
      data.design += entry.amount;
    }

    const catName = cat.name;
    data.byCategory[catName] = (data.byCategory[catName] || 0) + entry.amount;
  }

  // Also get the current month/day to compute projections
  const now = new Date();
  const dayOfYear =
    Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );
  const daysInYear =
    (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) ||
    now.getFullYear() % 400 === 0
      ? 366
      : 365;
  const yearProgress = dayOfYear / daysInYear;

  const years = Array.from(yearMap.keys()).sort();
  const summaries = years.map((year) => {
    const data = yearMap.get(year)!;
    const total = data.dev + data.design;
    return {
      year,
      dev: Math.round(data.dev * 100) / 100,
      design: Math.round(data.design * 100) / 100,
      total: Math.round(total * 100) / 100,
      byCategory: data.byCategory,
    };
  });

  // Build comparisons: each year vs prior year
  const comparisons = summaries.map((summary, i) => {
    const prior = i > 0 ? summaries[i - 1] : null;
    const isCurrentYear = summary.year === now.getFullYear();

    // Projected annual total if this is the current year
    const projectedDev = isCurrentYear && yearProgress > 0
      ? Math.round((summary.dev / yearProgress) * 100) / 100
      : summary.dev;
    const projectedDesign = isCurrentYear && yearProgress > 0
      ? Math.round((summary.design / yearProgress) * 100) / 100
      : summary.design;
    const projectedTotal = projectedDev + projectedDesign;

    let devVsPrior = null;
    let designVsPrior = null;
    let totalVsPrior = null;

    if (prior) {
      const compareDevTo = isCurrentYear ? projectedDev : summary.dev;
      const compareDesignTo = isCurrentYear ? projectedDesign : summary.design;
      const compareTotalTo = isCurrentYear ? projectedTotal : summary.total;

      devVsPrior = {
        amount: Math.round((prior.dev - compareDevTo) * 100) / 100,
        percent:
          prior.dev > 0
            ? Math.round(((prior.dev - compareDevTo) / prior.dev) * 10000) / 100
            : 0,
        direction: compareDevTo >= prior.dev ? ("up" as const) : ("down" as const),
      };
      designVsPrior = {
        amount: Math.round((prior.design - compareDesignTo) * 100) / 100,
        percent:
          prior.design > 0
            ? Math.round(
                ((prior.design - compareDesignTo) / prior.design) * 10000
              ) / 100
            : prior.design === 0 && compareDesignTo === 0
              ? 0
              : 100,
        direction:
          compareDesignTo >= prior.design ? ("up" as const) : ("down" as const),
      };
      totalVsPrior = {
        amount: Math.round((prior.total - compareTotalTo) * 100) / 100,
        percent:
          prior.total > 0
            ? Math.round(
                ((prior.total - compareTotalTo) / prior.total) * 10000
              ) / 100
            : 0,
        direction:
          compareTotalTo >= prior.total ? ("up" as const) : ("down" as const),
      };
    }

    return {
      ...summary,
      isCurrentYear,
      yearProgress: isCurrentYear ? Math.round(yearProgress * 10000) / 100 : 100,
      projectedDev,
      projectedDesign,
      projectedTotal,
      priorYear: prior?.year || null,
      devVsPrior,
      designVsPrior,
      totalVsPrior,
    };
  });

  return { summaries: comparisons, categories };
}

export async function getMonthlySpend(year: number) {
  const payPeriods = await prisma.payPeriod.findMany({
    where: { processingDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
    select: { processingDate: true, totalAmount: true },
  });

  const monthOrder = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const totals = new Map<string, number>();
  for (const m of monthOrder) totals.set(m, 0);
  for (const p of payPeriods) {
    const procStr = typeof p.processingDate === "string"
      ? p.processingDate
      : p.processingDate.toISOString();
    const match = procStr.match(/(\d{4})-(\d{2})-\d{2}/);
    if (!match) continue;
    const monthIdx = parseInt(match[2]) - 1;
    const monthName = monthOrder[monthIdx];
    totals.set(monthName, (totals.get(monthName) || 0) + p.totalAmount);
  }

  const months = monthOrder.map((m) => ({
    month: m,
    total: Math.round((totals.get(m) || 0) * 100) / 100,
  }));

  const grandTotal =
    Math.round(months.reduce((s, m) => s + m.total, 0) * 100) / 100;

  return { year, months, grandTotal };
}

export async function getDuplicatePayPeriods(year: number) {
  const payPeriods = await prisma.payPeriod.findMany({
    where: { year },
    include: { contractor: { select: { name: true } } },
    orderBy: [{ contractorId: "asc" }, { startDate: "asc" }],
  });

  const duplicates: {
    contractorName: string;
    periods: {
      id: string;
      start: string;
      end: string;
      amount: number;
      source: string;
    }[];
  }[] = [];

  // Group by contractor
  const byContractor = new Map<string, typeof payPeriods>();
  for (const p of payPeriods) {
    const key = p.contractorId;
    if (!byContractor.has(key)) byContractor.set(key, []);
    byContractor.get(key)!.push(p);
  }

  for (const [, periods] of byContractor) {
    // Check each pair for overlap
    const overlapping = new Set<string>();
    for (let i = 0; i < periods.length; i++) {
      for (let j = i + 1; j < periods.length; j++) {
        const a = periods[i];
        const b = periods[j];
        const aStart = new Date(a.startDate).getTime();
        const aEnd = new Date(a.endDate).getTime();
        const bStart = new Date(b.startDate).getTime();
        const bEnd = new Date(b.endDate).getTime();

        if (aStart <= bEnd && bStart <= aEnd) {
          overlapping.add(a.id);
          overlapping.add(b.id);
        }
      }
    }

    if (overlapping.size > 0) {
      const overlapPeriods = periods
        .filter((p) => overlapping.has(p.id))
        .map((p) => ({
          id: p.id,
          start: localDate(p.startDate, { month: "short", day: "numeric" }),
          end: localDate(p.endDate, { month: "short", day: "numeric" }),
          amount: p.totalAmount,
          source: p.source,
        }));

      duplicates.push({
        contractorName: periods[0].contractor.name,
        periods: overlapPeriods,
      });
    }
  }

  return duplicates;
}

export async function getMissingPayPeriods(year: number) {
  // Pay periods are Wed-Tue, paid on Wednesday
  // Generate all completed pay periods for the year up to now
  const now = new Date();

  // Find the first Wednesday of the year (or the last Wed of prior year)
  const janFirst = new Date(year, 0, 1);
  let firstWed = new Date(janFirst);
  const dayOfWeek = firstWed.getDay(); // 0=Sun
  // Find previous or current Wednesday
  const daysToWed = (dayOfWeek <= 3) ? (3 - dayOfWeek) : (10 - dayOfWeek);
  firstWed.setDate(firstWed.getDate() + daysToWed);
  // Biweekly pay periods: Wed to Tue (14 days), paid the following Wed
  // Use Jan 1, 2025 (a Wednesday) as an anchor and count forward/backward
  // to keep all years on the same biweekly cadence
  const anchor = new Date(2025, 0, 1); // Wed Jan 1, 2025

  // Find the first period start on or before Jan 1 of the target year
  const janFirstMs = janFirst.getTime();
  const anchorMs = anchor.getTime();
  const msIn14Days = 14 * 24 * 60 * 60 * 1000;
  const periodsBetween = Math.floor((janFirstMs - anchorMs) / msIn14Days);
  let periodStart = new Date(anchorMs + periodsBetween * msIn14Days);
  // Make sure we don't start after Jan 1
  if (periodStart.getTime() > janFirstMs) {
    periodStart = new Date(periodStart.getTime() - msIn14Days);
  }

  const periods: { start: Date; end: Date; payDate: Date }[] = [];

  while (true) {
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 13); // Tue, 2 weeks later

    const payDate = new Date(periodEnd);
    payDate.setDate(payDate.getDate() + 1); // Wed (next day after Tue)

    // Only include periods where the pay date has passed (meaning data should exist)
    if (payDate > now) break;
    // Only include periods in the target year
    if (periodStart.getFullYear() > year) break;

    if (
      periodStart.getFullYear() === year ||
      periodEnd.getFullYear() === year
    ) {
      periods.push({
        start: new Date(periodStart),
        end: new Date(periodEnd),
        payDate: new Date(payDate),
      });
    }

    // Next period starts 14 days later (biweekly)
    periodStart.setDate(periodStart.getDate() + 14);
  }

  // Get all existing pay periods for this year (with date ranges)
  const existingPeriods = await prisma.payPeriod.findMany({
    where: { year },
    select: {
      startDate: true,
      endDate: true,
      processingDate: true,
      contractorId: true,
    },
  });

  // Get active contractors
  const activeContractors = await prisma.contractor.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  // A biweekly window is "covered" for a contractor if ANY uploaded pay period
  // overlaps with it (by date range OR by processing date proximity)
  const missing: {
    start: string;
    end: string;
    payDate: string;
    missingContractors: string[];
  }[] = [];

  for (const period of periods) {
    const windowStart = period.start.getTime();
    const windowEnd = period.end.getTime();

    const missingContractors: string[] = [];

    for (const contractor of activeContractors) {
      const hasRecord = existingPeriods.some((ep) => {
        if (ep.contractorId !== contractor.id) return false;

        const epStart = new Date(String(ep.startDate)).getTime();
        const epEnd = new Date(String(ep.endDate)).getTime();
        const epProc = new Date(String(ep.processingDate)).getTime();

        // Check 1: uploaded period's date range overlaps this biweekly window
        const rangeOverlaps = epStart <= windowEnd && epEnd >= windowStart;

        // Check 2: processing date falls near the pay date (legacy/fallback)
        const payWindowStart = period.payDate.getTime() - 2 * 86400000;
        const payWindowEnd = period.payDate.getTime() + 5 * 86400000;
        const procDateMatches =
          epProc >= payWindowStart && epProc <= payWindowEnd;

        return rangeOverlaps || procDateMatches;
      });
      if (!hasRecord) {
        missingContractors.push(contractor.name);
      }
    }

    if (missingContractors.length > 0) {
      missing.push({
        start: period.start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        end: period.end.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        payDate: period.payDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        missingContractors,
      });
    }
  }

  // Only show the most recent missing periods (last 10)
  return {
    periods: missing.slice(-10),
    activeContractorCount: activeContractors.length,
  };
}

export async function terminateContractor(id: string) {
  const today = new Date().toLocaleDateString("en-US");
  await prisma.contractor.update({
    where: { id },
    data: { isActive: false, terminationDate: today },
  });
  return { success: true };
}

export async function deletePayPeriod(id: string) {
  await prisma.payPeriod.delete({ where: { id } });
  return { success: true };
}

export async function bulkDeletePayPeriods(ids: string[]) {
  await prisma.timeEntry.deleteMany({
    where: { payPeriodId: { in: ids } },
  });
  const result = await prisma.payPeriod.deleteMany({
    where: { id: { in: ids } },
  });
  return { success: true, deleted: result.count };
}

export async function getPayPeriodList(year: number) {
  const periods = await prisma.payPeriod.findMany({
    where: { year },
    include: {
      contractor: { select: { name: true } },
    },
    orderBy: [{ processingDate: "desc" }, { contractor: { name: "asc" } }],
  });

  return periods.map((p) => ({
    id: p.id,
    contractorName: p.contractor.name,
    startDate: localDate(p.startDate, { month: "short", day: "numeric", year: "numeric" }),
    endDate: localDate(p.endDate, { month: "short", day: "numeric", year: "numeric" }),
    processingDate: localDate(p.processingDate, { month: "short", day: "numeric", year: "numeric" }),
    amount: p.totalAmount,
    hours: p.totalHours,
    source: p.source,
  }));
}

export interface SheetImportResult {
  success?: boolean;
  error?: string;
  contractorsCreated: number;
  payPeriodsCreated: number;
  timeEntriesCreated: number;
  totalAmount: number;
  skippedRows: number;
  deletedPayPeriods: number;
}

export async function importGoogleSheetCsv(
  formData: FormData
): Promise<SheetImportResult> {
  const file = formData.get("file") as File;
  const format = formData.get("format") as SheetFormat;
  const clearExisting = formData.get("clearExisting") === "true";

  if (!file || !format) {
    return {
      error: "File and format are required",
      contractorsCreated: 0,
      payPeriodsCreated: 0,
      timeEntriesCreated: 0,
      totalAmount: 0,
      skippedRows: 0,
      deletedPayPeriods: 0,
    };
  }

  const csvText = await file.text();
  const parsed = parseGoogleSheetCsv(csvText, format);

  if (parsed.rows.length === 0) {
    return {
      error: "No valid data rows found in the CSV",
      contractorsCreated: 0,
      payPeriodsCreated: 0,
      timeEntriesCreated: 0,
      totalAmount: 0,
      skippedRows: parsed.skippedRows,
      deletedPayPeriods: 0,
    };
  }

  // Determine the year from the format selection (used for clearing)
  const targetYear = parseInt(format, 10);

  // Clear existing sheet-import data for this year if requested
  let deletedPayPeriods = 0;
  if (clearExisting) {
    const existing = await prisma.payPeriod.findMany({
      where: { year: targetYear, source: "sheet-import" },
      select: { id: true },
    });
    if (existing.length > 0) {
      // Delete time entries first (cascade should handle this, but be explicit)
      await prisma.timeEntry.deleteMany({
        where: { payPeriodId: { in: existing.map((p) => p.id) } },
      });
      const deleteResult = await prisma.payPeriod.deleteMany({
        where: { year: targetYear, source: "sheet-import" },
      });
      deletedPayPeriods = deleteResult.count;
    }
  }

  // Load all project categories for mapping
  const categories = await prisma.projectCategory.findMany();
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]));

  // Load existing contractors for matching
  const existingContractors = await prisma.contractor.findMany();
  const contractorMap = new Map(
    existingContractors.map((c) => [c.name.toLowerCase(), c])
  );

  let contractorsCreated = 0;
  let payPeriodsCreated = 0;
  let timeEntriesCreated = 0;
  let totalAmount = 0;

  for (const row of parsed.rows) {
    // Find or create contractor
    let contractor = contractorMap.get(row.name.toLowerCase());
    if (!contractor) {
      const newContractor = await prisma.contractor.create({
        data: {
          name: row.name,
          hourlyRate: row.hourlyRate || 0,
          jobTitle: row.wageType || "Contractor",
          isActive: false,
        },
      });
      contractor = newContractor;
      contractorMap.set(row.name.toLowerCase(), newContractor);
      contractorsCreated++;
    }

    // Create pay period
    const processingDate = new Date(row.processingDate + "T00:00:00");
    const payPeriod = await prisma.payPeriod.create({
      data: {
        contractorId: contractor.id,
        startDate: processingDate,
        endDate: processingDate,
        processingDate,
        month: row.month,
        year: row.year,
        totalHours: row.hours,
        totalAmount: row.usdAmount,
        source: "sheet-import",
      },
    });
    payPeriodsCreated++;
    totalAmount += row.usdAmount;

    // Create time entries for each non-zero category
    for (const [catName, amount] of Object.entries(row.categoryAmounts)) {
      const categoryId = categoryMap.get(catName);
      if (!categoryId) {
        // Skip categories that don't exist in the DB
        continue;
      }
      if (amount === 0) continue;

      // Compute approximate hours for this category based on proportion
      const proportion =
        row.usdAmount > 0 ? Math.abs(amount) / row.usdAmount : 0;
      const catHours = Math.round(row.hours * proportion * 100) / 100;

      await prisma.timeEntry.create({
        data: {
          payPeriodId: payPeriod.id,
          projectCategoryId: categoryId,
          description: `Sheet import (${format})`,
          hoursDecimal: catHours,
          amount,
        },
      });
      timeEntriesCreated++;
    }
  }

  return {
    success: true,
    contractorsCreated,
    payPeriodsCreated,
    timeEntriesCreated,
    totalAmount,
    skippedRows: parsed.skippedRows,
    deletedPayPeriods,
  };
}
