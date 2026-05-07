"use client";

import { useState, useCallback } from "react";
import { ExportButtons } from "../export-buttons";

interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  hours: number;
  percentage: number;
}

interface PayPeriodData {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  processingDate: string | Date;
  month: string;
  totalHours: number;
  totalAmount: number;
  source: string;
  effectiveRate?: number;
  timeEntries: {
    id: string;
    description: string | null;
    hoursDecimal: number;
    amount: number;
    projectCategory: { id: string; name: string };
  }[];
}

interface ContractorSummary {
  contractor: {
    id: string;
    name: string;
    hourlyRate: number;
    jobTitle: string;
    [key: string]: unknown;
  };
  totalHours: number;
  totalAmount: number;
  categoryBreakdown: CategoryBreakdown[];
  periods: PayPeriodData[];
}

interface DashboardData {
  categories: { id: string; name: string; sortOrder: number; isDev: boolean }[];
  contractorSummaries: ContractorSummary[];
  categoryTotals: { categoryId: string; categoryName: string; amount: number; hours: number }[];
  grandTotal: { hours: number; amount: number };
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function fmtPct(n: number): string {
  return n > 0 ? `${n.toFixed(1)}%` : "";
}

function fmtHrs(n: number): string {
  return n > 0 ? `${n.toFixed(1)}h` : "";
}

// Parse a UTC date string as a local date (avoids timezone shift showing previous day)
function fmtDate(d: string | Date): string {
  const s = typeof d === "string" ? d : d.toISOString();
  // Extract YYYY-MM-DD and create a local date
  const match = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return new Date(d).toLocaleDateString();
  return new Date(
    parseInt(match[1]),
    parseInt(match[2]) - 1,
    parseInt(match[3])
  ).toLocaleDateString();
}

export function DashboardTable({
  data,
  year,
}: {
  data: DashboardData;
  year: number;
}) {
  const [expandedContractor, setExpandedContractor] = useState<string | null>(null);
  const devCategories = data.categories.filter((c) => c.isDev);
  const designCategories = data.categories.filter((c) => !c.isDev);

  const hasData = data.contractorSummaries.some((cs) => cs.totalAmount > 0);

  // Compute dev/design totals per contractor
  function getDevTotal(cs: ContractorSummary) {
    return cs.categoryBreakdown
      .filter((b) => devCategories.some((d) => d.id === b.categoryId))
      .reduce((sum, b) => sum + b.amount, 0);
  }
  function getDesignTotal(cs: ContractorSummary) {
    return cs.categoryBreakdown
      .filter((b) => designCategories.some((d) => d.id === b.categoryId))
      .reduce((sum, b) => sum + b.amount, 0);
  }

  // Grand dev/design totals
  const grandDevTotal = data.contractorSummaries.reduce((sum, cs) => sum + getDevTotal(cs), 0);
  const grandDesignTotal = data.contractorSummaries.reduce((sum, cs) => sum + getDesignTotal(cs), 0);

  const allCategories = [...devCategories, ...designCategories];

  const getExportData = useCallback(() => {
    const headers = [
      "Name",
      "Job Title",
      "Rate",
      "Hours",
      "USD Amount",
      ...allCategories.map((c) =>
        c.name.replace(" [Dev]", "").replace(" [Design]", "")
      ),
      "YTD Dev Total",
      "YTD Design Total",
      "YTD Everything",
    ];

    const rows = data.contractorSummaries
      .filter((cs) => cs.totalAmount > 0)
      .map((cs) => {
        const rates = [
          ...new Set(cs.periods.map((p) => p.effectiveRate).filter((r): r is number => r != null && r > 0)),
        ];
        const rateStr =
          rates.length === 0
            ? `$${cs.contractor.hourlyRate}`
            : rates.length === 1
              ? `$${rates[0]}`
              : `$${Math.min(...rates)}-$${Math.max(...rates)}`;

        return [
          cs.contractor.name,
          cs.contractor.jobTitle,
          rateStr,
          cs.totalHours > 0 ? cs.totalHours.toFixed(1) : "",
          fmt(cs.totalAmount),
          ...allCategories.map((cat) => {
            const bd = cs.categoryBreakdown.find(
              (b) => b.categoryId === cat.id
            );
            return bd && bd.amount > 0 ? fmt(bd.amount) : "";
          }),
          fmt(getDevTotal(cs)),
          fmt(getDesignTotal(cs)),
          fmt(cs.totalAmount),
        ] as (string | number)[];
      });

    // Totals row
    rows.push([
      "TOTALS",
      "",
      "",
      fmtHrs(data.grandTotal.hours),
      fmt(data.grandTotal.amount),
      ...allCategories.map((cat) => {
        const ct = data.categoryTotals.find((t) => t.categoryId === cat.id);
        return ct && ct.amount > 0 ? fmt(ct.amount) : "";
      }),
      fmt(grandDevTotal),
      fmt(grandDesignTotal),
      fmt(data.grandTotal.amount),
    ]);

    return {
      title: `Contractor Charges ${year}`,
      headers,
      rows,
    };
  }, [data, year, allCategories, grandDevTotal, grandDesignTotal]);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <ExportButtons getData={getExportData} />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="text-left px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-gray-100 min-w-[160px]">
              Name
            </th>
            <th className="text-left px-3 py-2 font-semibold text-gray-700 min-w-[140px]">
              Job Title
            </th>
            <th className="text-right px-3 py-2 font-semibold text-gray-700 min-w-[60px]">
              Rate
            </th>
            <th className="text-right px-3 py-2 font-semibold text-gray-700 min-w-[70px]">
              Hours
            </th>
            <th className="text-right px-3 py-2 font-semibold text-gray-700 min-w-[90px] bg-blue-50">
              USD Amount
            </th>
            {devCategories.map((cat) => (
              <th
                key={cat.id}
                className="text-right px-3 py-2 font-semibold text-gray-700 min-w-[100px]"
                title={cat.name}
              >
                {cat.name.replace(" [Dev]", "").replace(" [Design]", "")}
              </th>
            ))}
            <th className="text-right px-3 py-2 font-semibold text-gray-700 min-w-[100px] bg-green-50 border-l-2 border-green-200">
              YTD Dev Total
            </th>
            {designCategories.map((cat) => (
              <th
                key={cat.id}
                className="text-right px-3 py-2 font-semibold text-gray-700 min-w-[100px] bg-yellow-50"
                title={cat.name}
              >
                {cat.name.replace(" [Dev]", "").replace(" [Design]", "")}
              </th>
            ))}
            <th className="text-right px-3 py-2 font-semibold text-gray-700 min-w-[110px] bg-orange-50 border-l-2 border-orange-200">
              YTD Design Total
            </th>
            <th className="text-right px-3 py-2 font-semibold text-gray-700 min-w-[110px] bg-purple-50 border-l-2 border-purple-200">
              YTD Everything
            </th>
          </tr>
        </thead>
        <tbody>
          {!hasData && (
            <tr>
              <td
                colSpan={8 + data.categories.length}
                className="text-center py-12 text-gray-400"
              >
                No data for {year}. Upload timesheets to get started.
              </td>
            </tr>
          )}
          {data.contractorSummaries
            .filter((cs) => cs.totalAmount > 0)
            .map((cs) => (
              <>
                <tr
                  key={cs.contractor.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    setExpandedContractor(
                      expandedContractor === cs.contractor.id
                        ? null
                        : cs.contractor.id
                    )
                  }
                >
                  <td className="px-3 py-2 font-medium text-gray-900 sticky left-0 bg-white">
                    <span className="mr-1 text-gray-400 text-xs">
                      {expandedContractor === cs.contractor.id ? "▼" : "▶"}
                    </span>
                    {cs.contractor.name}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {cs.contractor.jobTitle}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {(() => {
                      const rates = [...new Set(cs.periods.map((p) => p.effectiveRate).filter((r): r is number => r != null && r > 0))];
                      if (rates.length === 0) return `$${cs.contractor.hourlyRate}`;
                      if (rates.length === 1) return `$${rates[0]}`;
                      return (
                        <span title={`Multiple rates this year: ${rates.map(r => `$${r}`).join(', ')}`}>
                          ${Math.min(...rates)}-${Math.max(...rates)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {fmtHrs(cs.totalHours)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900 bg-blue-50">
                    {fmt(cs.totalAmount)}
                  </td>
                  {devCategories.map((cat) => {
                    const bd = cs.categoryBreakdown.find(
                      (b) => b.categoryId === cat.id
                    );
                    return (
                      <td key={cat.id} className="px-3 py-2 text-right">
                        {bd && bd.amount > 0 ? (
                          <div>
                            <div className="text-gray-900">{fmt(bd.amount)}</div>
                            <div className="text-xs text-gray-400">
                              {fmtPct(bd.percentage)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-semibold bg-green-50 border-l-2 border-green-200">
                    {getDevTotal(cs) > 0 ? fmt(getDevTotal(cs)) : <span className="text-gray-300">—</span>}
                  </td>
                  {designCategories.map((cat) => {
                    const bd = cs.categoryBreakdown.find(
                      (b) => b.categoryId === cat.id
                    );
                    return (
                      <td key={cat.id} className="px-3 py-2 text-right bg-yellow-50">
                        {bd && bd.amount > 0 ? (
                          <div>
                            <div className="text-gray-900">{fmt(bd.amount)}</div>
                            <div className="text-xs text-gray-400">
                              {fmtPct(bd.percentage)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-semibold bg-orange-50 border-l-2 border-orange-200">
                    {getDesignTotal(cs) > 0 ? fmt(getDesignTotal(cs)) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-bold bg-purple-50 border-l-2 border-purple-200">
                    {cs.totalAmount > 0 ? fmt(cs.totalAmount) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
                {expandedContractor === cs.contractor.id && (
                  <tr key={`${cs.contractor.id}-detail`}>
                    <td
                      colSpan={8 + data.categories.length}
                      className="bg-gray-50 px-6 py-3"
                    >
                      <div className="text-xs font-semibold text-gray-500 mb-2">
                        Pay Periods
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500">
                            <th className="text-left py-1 px-2">Period</th>
                            <th className="text-left py-1 px-2">Source</th>
                            <th className="text-right py-1 px-2">Rate</th>
                            <th className="text-right py-1 px-2">Hours</th>
                            <th className="text-right py-1 px-2">Amount</th>
                            <th className="text-left py-1 px-2">Tasks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cs.periods.map((p) => (
                            <tr key={p.id} className="border-t border-gray-200">
                              <td className="py-1 px-2 text-gray-700">
                                {fmtDate(p.startDate)} —{" "}
                                {fmtDate(p.endDate)}
                              </td>
                              <td className="py-1 px-2">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                                    p.source === "clockify"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-orange-100 text-orange-700"
                                  }`}
                                >
                                  {p.source}
                                </span>
                              </td>
                              <td className="py-1 px-2 text-right text-gray-500">
                                {p.effectiveRate ? `$${p.effectiveRate}/hr` : "—"}
                              </td>
                              <td className="py-1 px-2 text-right text-gray-700">
                                {fmtHrs(p.totalHours)}
                              </td>
                              <td className="py-1 px-2 text-right text-gray-700">
                                {fmt(p.totalAmount)}
                              </td>
                              <td className="py-1 px-2 text-gray-500">
                                {p.timeEntries.slice(0, 5).map((e) => (
                                  <span
                                    key={e.id}
                                    className="inline-block mr-1 mb-1 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs"
                                  >
                                    {e.description || e.projectCategory.name} ({fmt(e.amount)})
                                  </span>
                                ))}
                                {p.timeEntries.length > 5 && (
                                  <span className="text-gray-400">
                                    +{p.timeEntries.length - 5} more
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            ))}
        </tbody>
        {hasData && (
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
              <td className="px-3 py-2 sticky left-0 bg-gray-100">TOTALS</td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2 text-right">
                {fmtHrs(data.grandTotal.hours)}
              </td>
              <td className="px-3 py-2 text-right bg-blue-100">
                {fmt(data.grandTotal.amount)}
              </td>
              {devCategories.map((cat) => {
                const ct = data.categoryTotals.find(
                  (t) => t.categoryId === cat.id
                );
                return (
                  <td key={cat.id} className="px-3 py-2 text-right">
                    {ct && ct.amount > 0 ? fmt(ct.amount) : "—"}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right bg-green-100 border-l-2 border-green-200 font-bold">
                {grandDevTotal > 0 ? fmt(grandDevTotal) : "—"}
              </td>
              {designCategories.map((cat) => {
                const ct = data.categoryTotals.find(
                  (t) => t.categoryId === cat.id
                );
                return (
                  <td key={cat.id} className="px-3 py-2 text-right bg-yellow-50">
                    {ct && ct.amount > 0 ? fmt(ct.amount) : "—"}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right bg-orange-100 border-l-2 border-orange-200 font-bold">
                {grandDesignTotal > 0 ? fmt(grandDesignTotal) : "—"}
              </td>
              <td className="px-3 py-2 text-right bg-purple-100 border-l-2 border-purple-200 font-bold">
                {fmt(data.grandTotal.amount)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
    </div>
  );
}
