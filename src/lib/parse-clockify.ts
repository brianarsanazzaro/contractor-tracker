export interface ClockifyRow {
  project: string;
  client: string;
  description: string;
  timeH: string;
  timeDecimal: number;
  amountUsd: number;
}

export interface ParsedTimesheet {
  contractorName: string;
  startDate: string;
  endDate: string;
  rows: ClockifyRow[];
  totalHours: number;
  totalAmount: number;
  projectSummary: Record<string, { hours: number; amount: number; percentage: number }>;
}

export function parseClockifyCsv(
  csvText: string,
  contractorName: string,
  startDate: string,
  endDate: string
): ParsedTimesheet {
  const lines = csvText.trim().split("\n");
  const header = parseCsvLine(lines[0]);

  const projectIdx = header.findIndex((h) => h.toLowerCase() === "project");
  const clientIdx = header.findIndex((h) => h.toLowerCase() === "client");
  const descIdx = header.findIndex((h) => h.toLowerCase() === "description");
  const timeHIdx = header.findIndex((h) => h.toLowerCase().includes("time (h)"));
  const timeDecIdx = header.findIndex((h) => h.toLowerCase().includes("time (decimal)"));
  const amountIdx = header.findIndex((h) => h.toLowerCase().includes("amount"));

  const rows: ClockifyRow[] = [];
  let totalHours = 0;
  let totalAmount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 4) continue;

    const timeDecimal = parseFloat(cols[timeDecIdx]) || 0;
    const amountUsd = parseFloat(cols[amountIdx]) || 0;

    rows.push({
      project: cols[projectIdx] || "",
      client: cols[clientIdx] || "",
      description: cols[descIdx] || "",
      timeH: cols[timeHIdx] || "",
      timeDecimal,
      amountUsd,
    });

    totalHours += timeDecimal;
    totalAmount += amountUsd;
  }

  // Build project summary
  const projectSummary: Record<string, { hours: number; amount: number; percentage: number }> = {};
  for (const row of rows) {
    const key = `${row.project}|${row.client}`;
    if (!projectSummary[key]) {
      projectSummary[key] = { hours: 0, amount: 0, percentage: 0 };
    }
    projectSummary[key].hours += row.timeDecimal;
    projectSummary[key].amount += row.amountUsd;
  }
  for (const key of Object.keys(projectSummary)) {
    projectSummary[key].percentage = totalHours > 0
      ? (projectSummary[key].hours / totalHours) * 100
      : 0;
  }

  return {
    contractorName,
    startDate,
    endDate,
    rows,
    totalHours,
    totalAmount,
    projectSummary,
  };
}

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
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
