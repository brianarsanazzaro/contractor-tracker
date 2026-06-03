import { getYearSummaries } from "./actions";
import { DashboardExport } from "./dashboard-export";

function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function ComparisonBadge({
  comparison,
  label,
}: {
  comparison: {
    amount: number;
    percent: number;
    direction: "up" | "down";
  } | null;
  label: string;
}) {
  if (!comparison) return null;
  const isDown = comparison.direction === "down";
  return (
    <div
      className={`text-sm rounded-lg p-3 ${isDown ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
    >
      <span className={`font-semibold ${isDown ? "text-green-700" : "text-red-700"}`}>
        {comparison.percent.toFixed(2)}% {isDown ? "less" : "more"}
      </span>
      <span className="text-gray-500 ml-1">
        than {label} ({fmt(Math.abs(comparison.amount))}{" "}
        {isDown ? "under" : "over"})
      </span>
    </div>
  );
}

export default async function DashboardPage() {
  const { summaries } = await getYearSummaries();

  // Show most recent year first
  const reversed = [...summaries].reverse();

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <DashboardExport summaries={reversed} />
      </div>

      <div className="space-y-8">
        {reversed.map((s) => (
          <div key={s.year} className="print-year">
            {/* Year header */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-gray-900">{s.year}</h2>
              {s.isCurrentYear && (
                <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 font-medium">
                  Current year &middot; {s.yearProgress}% elapsed
                </span>
              )}
            </div>

            {/* YTD totals */}
            {s.isCurrentYear ? (
              /* Current year: dev only, no design */
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-lg border border-blue-200 bg-blue-50 p-5">
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                    YTD Dev Total
                  </div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    {fmt(s.dev)}
                  </div>
                  <div className="text-xs text-blue-400 mt-1">
                    Projected: {fmt(s.projectedDev)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 flex items-center">
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Design / Data Entry
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Not tracked this year — handled by design department
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Past years: show all three */
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    YTD Dev
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {fmt(s.dev)}
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    YTD Design / Data Entry
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {fmt(s.design)}
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-blue-200 bg-blue-50 p-5">
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                    YTD Dev + Design Total
                  </div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    {fmt(s.total)}
                  </div>
                </div>
              </div>
            )}

            {/* Year-over-year comparisons */}
            {s.priorYear && (
              <div className="space-y-2 mb-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Compared to {s.priorYear}
                  {s.isCurrentYear ? " (projected, dev only)" : ""}
                </div>
                {s.isCurrentYear ? (
                  /* Current year: just dev comparison */
                  <div className="grid grid-cols-1 gap-3 max-w-md">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Dev spend vs {s.priorYear}</div>
                      <ComparisonBadge
                        comparison={s.devVsPrior}
                        label={String(s.priorYear)}
                      />
                    </div>
                  </div>
                ) : (
                  /* Past years: all three comparisons */
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Dev</div>
                      <ComparisonBadge
                        comparison={s.devVsPrior}
                        label={String(s.priorYear)}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">
                        Design / Data Entry
                      </div>
                      <ComparisonBadge
                        comparison={s.designVsPrior}
                        label={String(s.priorYear)}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">
                        Dev + Design Total
                      </div>
                      <ComparisonBadge
                        comparison={s.totalVsPrior}
                        label={String(s.priorYear)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Per-category breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 font-semibold text-gray-600">
                      Category
                    </th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-600">
                      Amount
                    </th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-600">
                      % of Total
                    </th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-600 w-1/3">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(s.byCategory)
                    .filter(([, amt]) => amt > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([catName, amt]) => {
                      const pct =
                        s.total > 0 ? (amt / s.total) * 100 : 0;
                      return (
                        <tr
                          key={catName}
                          className="border-b border-gray-100"
                        >
                          <td className="px-4 py-2 text-gray-700">
                            {catName}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-900 font-medium">
                            {fmt(amt)}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-500">
                            {pct.toFixed(1)}%
                          </td>
                          <td className="px-4 py-2">
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{
                                  width: `${Math.min(pct, 100)}%`,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-4 py-2 text-gray-700">Total</td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {fmt(s.total)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500">
                      100%
                    </td>
                    <td className="px-4 py-2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
