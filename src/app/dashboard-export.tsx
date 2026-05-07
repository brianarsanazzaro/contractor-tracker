"use client";

import { ExportButtons } from "./export-buttons";

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
  return (
    <ExportButtons
      getData={() => {
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

        const rows = summaries.map((s) => [
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

        // Add blank row then category breakdowns per year
        for (const s of summaries) {
          rows.push([] as unknown as (string | number)[]);
          rows.push([`--- ${s.year} Category Breakdown ---`, "", "", "", "", "", "", ""]);
          const entries = Object.entries(s.byCategory)
            .filter(([, amt]) => amt > 0)
            .sort(([, a], [, b]) => b - a);
          for (const [cat, amt] of entries) {
            const pct = s.total > 0 ? ((amt / s.total) * 100).toFixed(1) + "%" : "0%";
            rows.push([s.year, cat, fmt(amt), pct, "", "", "", ""]);
          }
        }

        return {
          title: "Dashboard - Year Comparisons",
          headers,
          rows,
        };
      }}
    />
  );
}
