/**
 * Parser for Google Sheet CSV exports of contractor hours.
 * Supports 2024, 2025, and 2026 formats which have different column layouts.
 */

export type SheetFormat = "2024" | "2025" | "2026";

export interface SheetRow {
  name: string;
  processingDate: string; // ISO date string
  month: string;
  year: number;
  wageType: string;
  usdAmount: number;
  hours: number;
  hourlyRate: number;
  /** Map of normalized project category name -> dollar amount */
  categoryAmounts: Record<string, number>;
}

export interface ParsedSheet {
  format: SheetFormat;
  rows: SheetRow[];
  totalAmount: number;
  totalRows: number;
  skippedRows: number;
}

// Canonical category names that match the DB
const CATEGORY = {
  HUBSPOT_DEV: "HubSpot [Dev]",
  BTC_DEV: "BTC [Dev]",
  BTCU_DEV: "BTC-U [Dev]",
  ONESHOT_DEV: "BTC Events (#oneshot) [Dev]",
  BTC_EVENTS_SHOW: "BTC Events (btc show, on tour) [Dev]",
  WDYH_DEV: "WDYH [Dev]",
  ARC_DEV: "ARC [Dev]",
  CLOUD_DEV: "Cloud Architect & Security [Dev]",
  WDYH_DESIGN: "WDYH [Design]",
  OTHER_DESIGN: "Other 1-off Design/Data Entry",
} as const;

/**
 * Parse a dollar amount string like " $ 1,167.50 " or " $ -   " into a number.
 */
export function parseDollarAmount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/\$/g, "").replace(/,/g, "").trim();
  if (cleaned === "-" || cleaned === "" || cleaned === "0") return 0;
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/**
 * Parse a percentage string like "100%" or "50.5%" or empty string into a number 0-100.
 */
function parsePercentage(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/%/g, "").trim();
  if (cleaned === "-" || cleaned === "" || cleaned === "0") return 0;
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/**
 * Parse a date string from the sheet. Handles formats like "1/15/2026" or "01/15/2026".
 * Returns an ISO date string (YYYY-MM-DD).
 */
function parseDate(raw: string): { iso: string; month: string; year: number } | null {
  if (!raw || raw.trim() === "") return null;
  const trimmed = raw.trim();

  // Try MM/DD/YYYY format
  const parts = trimmed.split("/");
  if (parts.length === 3) {
    const m = parseInt(parts[0], 10);
    const d = parseInt(parts[1], 10);
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;

    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000) {
      const date = new Date(y, m - 1, d);
      const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const monthName = date.toLocaleString("en-US", { month: "long" });
      return { iso, month: monthName, year: y };
    }
  }

  // Try ISO format
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    const date = new Date(y, m - 1, d);
    const monthName = date.toLocaleString("en-US", { month: "long" });
    return { iso: trimmed.substring(0, 10), month: monthName, year: y };
  }

  return null;
}

/**
 * Find a column index by matching header text (case-insensitive, partial match).
 * Returns -1 if not found.
 */
function findCol(headers: string[], ...patterns: string[]): number {
  for (const pattern of patterns) {
    const lower = pattern.toLowerCase();
    const idx = headers.findIndex((h) => h.toLowerCase().includes(lower));
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Find a column index with exact-ish matching (case-insensitive, trimmed).
 */
function findColExact(headers: string[], ...patterns: string[]): number {
  for (const pattern of patterns) {
    const lower = pattern.toLowerCase().trim();
    const idx = headers.findIndex((h) => h.toLowerCase().trim() === lower);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parse a CSV line handling quoted fields with commas and escaped quotes.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * For a given pair of % and $ columns, compute the effective dollar amount.
 * If $ column has a value, use it. If $ is 0 but % is non-zero, compute from totalAmount.
 */
function resolveAmount(
  cols: string[],
  pctIdx: number,
  dolIdx: number,
  totalAmount: number
): number {
  const dollarVal = dolIdx >= 0 && dolIdx < cols.length ? parseDollarAmount(cols[dolIdx]) : 0;
  const pctVal = pctIdx >= 0 && pctIdx < cols.length ? parsePercentage(cols[pctIdx]) : 0;

  if (dollarVal !== 0) return dollarVal;
  if (pctVal !== 0 && totalAmount !== 0) {
    return Math.round((pctVal / 100) * totalAmount * 100) / 100;
  }
  return 0;
}

// ── Format-specific column mappings ──────────────────────────────────────────

interface ColumnMap {
  name: number;
  processingDate: number;
  month: number;
  wageType: number;
  usdAmount: number;
  hours: number;
  hourlyRate: number;
  /** Pairs of [percentIdx, dollarIdx, canonicalCategoryName] */
  categories: [number, number, string][];
}

function buildColumnMap2026(headers: string[]): ColumnMap {
  const cats: [number, number, string][] = [];

  const pctHubspot = findCol(headers, "% hubspot [dev]");
  const dolHubspot = findCol(headers, "$ hubspot [dev]");
  if (pctHubspot >= 0) cats.push([pctHubspot, dolHubspot, CATEGORY.HUBSPOT_DEV]);

  const pctBtc = findColExact(headers, "% BTC [Dev]");
  const dolBtc = findColExact(headers, "$ BTC [Dev]");
  if (pctBtc >= 0) cats.push([pctBtc, dolBtc, CATEGORY.BTC_DEV]);

  const pctBtcu = findCol(headers, "% btc-u [dev]");
  const dolBtcu = findCol(headers, "$ btcu [dev]");
  if (pctBtcu >= 0) cats.push([pctBtcu, dolBtcu, CATEGORY.BTCU_DEV]);

  const pctOneshot = findCol(headers, "% btc events (#oneshot) [dev]");
  const dolOneshot = findCol(headers, "$ btc events (#oneshot) [dev]");
  if (pctOneshot >= 0) cats.push([pctOneshot, dolOneshot, CATEGORY.ONESHOT_DEV]);

  const pctShow = findCol(headers, "% btc events (btc show, on tour) [dev]");
  const dolShow = findCol(headers, "$ btc events (btc show, on tour) [dev]");
  if (pctShow >= 0) cats.push([pctShow, dolShow, CATEGORY.BTC_EVENTS_SHOW]);

  const pctWdyhDev = findColExact(headers, "% wdyh [Dev]");
  const dolWdyhDev = findColExact(headers, "$ wdyh [Dev]");
  if (pctWdyhDev >= 0) cats.push([pctWdyhDev, dolWdyhDev, CATEGORY.WDYH_DEV]);

  const pctArc = findCol(headers, "% arc [dev]");
  const dolArc = findCol(headers, "$ arc [dev]");
  if (pctArc >= 0) cats.push([pctArc, dolArc, CATEGORY.ARC_DEV]);

  const pctCloud = findCol(headers, "% cloud architect & security [dev]");
  const dolCloud = findCol(headers, "$ cloud architect & security [dev]");
  if (pctCloud >= 0) cats.push([pctCloud, dolCloud, CATEGORY.CLOUD_DEV]);

  const pctWdyhDesign = findColExact(headers, "% wdyh [Design]");
  const dolWdyhDesign = findColExact(headers, "$ wdyh [Design]");
  if (pctWdyhDesign >= 0) cats.push([pctWdyhDesign, dolWdyhDesign, CATEGORY.WDYH_DESIGN]);

  const pctOther = findCol(headers, "% other 1 off design");
  const dolOther = findCol(headers, "$ other 1 off design");
  if (pctOther >= 0) cats.push([pctOther, dolOther, CATEGORY.OTHER_DESIGN]);

  return {
    name: findCol(headers, "name"),
    processingDate: findCol(headers, "processing date"),
    month: findCol(headers, "month"),
    wageType: findCol(headers, "wage type"),
    usdAmount: findCol(headers, "usd amount"),
    hours: findColExact(headers, "hours"),
    hourlyRate: findCol(headers, "hourly rate"),
    categories: cats,
  };
}

function buildColumnMap2025(headers: string[]): ColumnMap {
  const cats: [number, number, string][] = [];

  const pctHubspot = findCol(headers, "% hubspot [dev]");
  const dolHubspot = findCol(headers, "$ hubspot [dev]");
  if (pctHubspot >= 0) cats.push([pctHubspot, dolHubspot, CATEGORY.HUBSPOT_DEV]);

  const pctBtc = findColExact(headers, "% BTC [Dev]");
  const dolBtc = findColExact(headers, "$ BTC [Dev]");
  if (pctBtc >= 0) cats.push([pctBtc, dolBtc, CATEGORY.BTC_DEV]);

  const pctBtcu = findCol(headers, "% btc-u [dev]");
  const dolBtcu = findCol(headers, "$ btcu [dev]");
  if (pctBtcu >= 0) cats.push([pctBtcu, dolBtcu, CATEGORY.BTCU_DEV]);

  // 2025 uses "% oneshot [dev]" instead of the full name
  const pctOneshot = findCol(headers, "% oneshot [dev]");
  const dolOneshot = findCol(headers, "$ oneshot [dev]");
  if (pctOneshot >= 0) cats.push([pctOneshot, dolOneshot, CATEGORY.ONESHOT_DEV]);

  const pctWdyhDev = findColExact(headers, "% wdyh [Dev]");
  const dolWdyhDev = findColExact(headers, "$ wdyh [Dev]");
  if (pctWdyhDev >= 0) cats.push([pctWdyhDev, dolWdyhDev, CATEGORY.WDYH_DEV]);

  const pctArc = findCol(headers, "% arc [dev]");
  const dolArc = findCol(headers, "$ arc [dev]");
  if (pctArc >= 0) cats.push([pctArc, dolArc, CATEGORY.ARC_DEV]);

  const pctWdyhDesign = findColExact(headers, "% wdyh [Design]");
  const dolWdyhDesign = findColExact(headers, "$ wdyh [Design]");
  if (pctWdyhDesign >= 0) cats.push([pctWdyhDesign, dolWdyhDesign, CATEGORY.WDYH_DESIGN]);

  const pctOther = findCol(headers, "% other 1 off design");
  const dolOther = findCol(headers, "$ other 1 off design");
  if (pctOther >= 0) cats.push([pctOther, dolOther, CATEGORY.OTHER_DESIGN]);

  // 2025: cloud architect & security is at the END
  const pctCloud = findCol(headers, "% cloud architect & security [dev]");
  const dolCloud = findCol(headers, "$ cloud architect & security [dev]");
  if (pctCloud >= 0) cats.push([pctCloud, dolCloud, CATEGORY.CLOUD_DEV]);

  return {
    name: findCol(headers, "name"),
    processingDate: findCol(headers, "processing date"),
    month: findCol(headers, "month"),
    wageType: findCol(headers, "wage type"),
    usdAmount: findCol(headers, "usd amount"),
    hours: findColExact(headers, "hours"),
    hourlyRate: findCol(headers, "hourly rate"),
    categories: cats,
  };
}

function buildColumnMap2024(headers: string[]): ColumnMap {
  const cats: [number, number, string][] = [];

  // HubSpot
  const pctHubspot = findCol(headers, "% hubspot (dev)");
  const dolHubspot = findCol(headers, "$ hubspot (dev)");
  if (pctHubspot >= 0) cats.push([pctHubspot, dolHubspot, CATEGORY.HUBSPOT_DEV]);

  // Cloud Architect & Security
  const pctCloud = findCol(headers, "% cloud architect & security");
  const dolCloud = findCol(headers, "$ cloud architect & security");
  if (pctCloud >= 0) cats.push([pctCloud, dolCloud, CATEGORY.CLOUD_DEV]);

  // BTC-U Dev
  const pctBtcu = findCol(headers, "% btcu dev");
  const dolBtcu = findCol(headers, "$ btcu dev");
  if (pctBtcu >= 0) cats.push([pctBtcu, dolBtcu, CATEGORY.BTCU_DEV]);

  // BTC Events (#oneshot) [Dev] - "post 10/24/24-oneshot %"
  const pctOneshotPost = findCol(headers, "post 10/24/24-oneshot %");
  const dolOneshotPost = findCol(headers, "post 10/24/24-oneshot $");
  if (pctOneshotPost >= 0) cats.push([pctOneshotPost, dolOneshotPost, CATEGORY.ONESHOT_DEV]);

  // BTC [Dev] - "post 10/24/24-btc %" AND "percentage for #ONESHOT/BTC dev (pre october)"
  // We'll handle both columns and sum them
  const pctBtcPost = findCol(headers, "post 10/24/24-btc %");
  const dolBtcPost = findCol(headers, "post 10/24/24-btc $");
  if (pctBtcPost >= 0) cats.push([pctBtcPost, dolBtcPost, CATEGORY.BTC_DEV]);

  // Pre-october oneshot/btc also maps to BTC [Dev]
  const pctBtcPre = findCol(headers, "percentage for #oneshot/btc dev (pre october)");
  const dolBtcPre = findCol(headers, "$ for oneshot/btc dev (pre october)");
  if (pctBtcPre >= 0) cats.push([pctBtcPre, dolBtcPre, CATEGORY.BTC_DEV]);

  // ARC Dev
  const pctArc = findCol(headers, "% arc dev");
  const dolArc = findCol(headers, "$ for arc dev");
  if (pctArc >= 0) cats.push([pctArc, dolArc, CATEGORY.ARC_DEV]);

  // WDYH Design
  const pctWdyhDesign = findCol(headers, "% wdyh.com design");
  const dolWdyhDesign = findCol(headers, "$ for wdyh design");
  if (pctWdyhDesign >= 0) cats.push([pctWdyhDesign, dolWdyhDesign, CATEGORY.WDYH_DESIGN]);

  // WDYH Dev
  const pctWdyhDev = findCol(headers, "% wdyh.com dev");
  const dolWdyhDev = findCol(headers, "$ for wdyh dev");
  if (pctWdyhDev >= 0) cats.push([pctWdyhDev, dolWdyhDev, CATEGORY.WDYH_DEV]);

  // Other 1-off design
  const pctOther = findCol(headers, "% other 1 off design");
  const dolOther = findCol(headers, "$ other 1 off design");
  if (pctOther >= 0) cats.push([pctOther, dolOther, CATEGORY.OTHER_DESIGN]);

  // Additional 2024-only categories that map to Other 1-off Design/Data Entry:
  // oneshot/btc show design, btc-u design, email design, btc beauty box design, ad team design, heather
  // These are less common and we'll map them all to OTHER_DESIGN
  const extraDesignPairs: [string, string][] = [
    ["% oneshot/btc show design", "$ oneshot design"],
    ["% for btc-u design", "$ for btcu design"],
    ["%-email design", "$-email design"],
    ["% btc beauty box design", "$ btc beauty box design"],
    ["% ad team design", "$ ad team design"],
    ["% heather", "$ heather"],
  ];
  for (const [pctPattern, dolPattern] of extraDesignPairs) {
    const pctIdx = findCol(headers, pctPattern);
    const dolIdx = findCol(headers, dolPattern);
    if (pctIdx >= 0) cats.push([pctIdx, dolIdx, CATEGORY.OTHER_DESIGN]);
  }

  return {
    name: findCol(headers, "name"),
    processingDate: findCol(headers, "processing date"),
    month: -1, // 2024 doesn't have a month column
    wageType: findCol(headers, "wage type"),
    usdAmount: findCol(headers, "usd amount"),
    hours: findColExact(headers, "hours"),
    hourlyRate: findCol(headers, "hourly rate"),
    categories: cats,
  };
}

/**
 * Main entry point: parse a Google Sheet CSV export.
 */
export function parseGoogleSheetCsv(csvText: string, format: SheetFormat): ParsedSheet {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 3) {
    return { format, rows: [], totalAmount: 0, totalRows: 0, skippedRows: 0 };
  }

  // For 2026 format: first row is "Totals:" summary, second row is headers.
  // For 2025/2024: check if first row looks like totals or headers.
  let headerLineIdx: number;
  const firstLineCols = parseCsvLine(lines[0]);
  const firstCellLower = firstLineCols[0]?.toLowerCase().trim() || "";

  if (firstCellLower === "totals:" || firstCellLower.startsWith("total")) {
    headerLineIdx = 1;
  } else if (firstCellLower === "name") {
    headerLineIdx = 0;
  } else {
    // Try second line
    const secondLineCols = parseCsvLine(lines[1]);
    if (secondLineCols[0]?.toLowerCase().trim() === "name") {
      headerLineIdx = 1;
    } else {
      headerLineIdx = 0;
    }
  }

  const headers = parseCsvLine(lines[headerLineIdx]);

  // Build column map based on format
  let colMap: ColumnMap;
  switch (format) {
    case "2026":
      colMap = buildColumnMap2026(headers);
      break;
    case "2025":
      colMap = buildColumnMap2025(headers);
      break;
    case "2024":
      colMap = buildColumnMap2024(headers);
      break;
  }

  const rows: SheetRow[] = [];
  let totalAmount = 0;
  let skippedRows = 0;

  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      skippedRows++;
      continue;
    }

    const cols = parseCsvLine(line);

    // Get contractor name
    const name = colMap.name >= 0 ? cols[colMap.name]?.trim() : "";
    if (!name) {
      skippedRows++;
      continue;
    }

    // Skip totals rows
    if (name.toLowerCase().startsWith("total")) {
      skippedRows++;
      continue;
    }

    // Get USD amount
    const usdAmountRaw = colMap.usdAmount >= 0 ? cols[colMap.usdAmount] || "" : "";
    const usdAmount = parseDollarAmount(usdAmountRaw);
    if (usdAmount === 0) {
      skippedRows++;
      continue;
    }

    // Get processing date
    const dateRaw = colMap.processingDate >= 0 ? cols[colMap.processingDate] || "" : "";
    const dateInfo = parseDate(dateRaw);
    if (!dateInfo) {
      skippedRows++;
      continue;
    }

    // Parse hours and hourly rate
    const hoursRaw = colMap.hours >= 0 ? cols[colMap.hours] || "" : "";
    const hours = parseFloat(hoursRaw.replace(/,/g, "")) || 0;
    const rateRaw = colMap.hourlyRate >= 0 ? cols[colMap.hourlyRate] || "" : "";
    const hourlyRate = parseDollarAmount(rateRaw);

    // Get wage type
    const wageType = colMap.wageType >= 0 ? cols[colMap.wageType]?.trim() || "" : "";

    // Get month - use column if available, otherwise derive from date
    let month = dateInfo.month;
    if (colMap.month >= 0 && cols[colMap.month]?.trim()) {
      month = cols[colMap.month].trim();
    }

    // Build category amounts
    const categoryAmounts: Record<string, number> = {};
    for (const [pctIdx, dolIdx, catName] of colMap.categories) {
      const amount = resolveAmount(cols, pctIdx, dolIdx, usdAmount);
      if (amount !== 0) {
        // Sum if the same category appears multiple times (e.g., 2024 BTC pre/post)
        categoryAmounts[catName] = (categoryAmounts[catName] || 0) + amount;
      }
    }

    rows.push({
      name,
      processingDate: dateInfo.iso,
      month,
      year: dateInfo.year,
      wageType,
      usdAmount,
      hours,
      hourlyRate,
      categoryAmounts,
    });

    totalAmount += usdAmount;
  }

  return {
    format,
    rows,
    totalAmount,
    totalRows: rows.length,
    skippedRows,
  };
}
