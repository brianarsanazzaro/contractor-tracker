"use client";

import { useCallback } from "react";

interface YearSummary {
  year: number;
  dev: number;
  design: number;
  total: number;
  isCurrentYear: boolean;
  projectedDev: number;
  projectedDesign: number;
  projectedTotal: number;
  priorYear: number | null;
  devVsPrior: { amount: number; percent: number; direction: string } | null;
  designVsPrior: { amount: number; percent: number; direction: string } | null;
  totalVsPrior: { amount: number; percent: number; direction: string } | null;
  byCategory: Record<string, number>;
}

function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

export function DashboardExport({
  summaries,
}: {
  summaries: YearSummary[];
}) {
  const exportExcel = useCallback(async () => {
    const XLSX = await import("xlsx");

    const headers = [
      "Year",
      "YTD Dev",
      "YTD Design",
      "YTD Total",
      "Projected Dev",
      "Projected Total",
      "vs Prior Year",
      "% Change",
    ];

    const rows: (string | number)[][] = summaries.map((s) => [
      s.year,
      fmt(s.dev),
      fmt(s.design),
      fmt(s.total),
      s.isCurrentYear ? fmt(s.projectedDev) : "N/A",
      s.isCurrentYear ? fmt(s.projectedTotal) : "N/A",
      s.totalVsPrior
        ? `${fmt(Math.abs(s.totalVsPrior.amount))} ${s.totalVsPrior.direction === "down" ? "under" : "over"}`
        : "N/A",
      s.totalVsPrior
        ? `${s.totalVsPrior.percent.toFixed(2)}% ${s.totalVsPrior.direction === "down" ? "less" : "more"}`
        : "N/A",
    ]);

    for (const s of summaries) {
      rows.push([]);
      rows.push([`--- ${s.year} Category Breakdown ---`, "", "", "", "", "", "", ""]);
      const entries = Object.entries(s.byCategory)
        .filter(([, amt]) => amt > 0)
        .sort(([, a], [, b]) => b - a);
      for (const [cat, amt] of entries) {
        const pct = s.total > 0 ? ((amt / s.total) * 100).toFixed(1) + "%" : "0%";
        rows.push([s.year, cat, fmt(amt), pct, "", "", "", ""]);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map((r) => String(r[i] ?? "").length)
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dashboard");
    XLSX.writeFile(wb, "Dashboard - Year Comparisons.xlsx");
  }, [summaries]);

  const exportPdf = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="flex gap-2 print:hidden">
      <button
        onClick={exportExcel}
        className="px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700"
      >
        Export Excel
      </button>
      <button
        onClick={exportPdf}
        className="px-3 py-1.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700"
      >
        Export PDF
      </button>
    </div>
  );
}
