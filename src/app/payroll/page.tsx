import { getPayrollByPayee } from "../actions";

function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const parsedYear = parseInt(params.year || "", 10);
  const year = Number.isFinite(parsedYear)
    ? parsedYear
    : new Date().getFullYear();
  const payments = await getPayrollByPayee(year);

  const routed = payments.filter((p) => p.lines.length > 1);
  const yearTotal = payments.reduce((s, p) => s + p.total, 0);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">
          Payroll by Payee — {year}
        </h1>
        <div className="flex gap-2">
          {[2024, 2025, 2026].map((y) => (
            <a
              key={y}
              href={`/payroll?year=${y}`}
              className={`px-3 py-1.5 text-sm rounded ${
                y === year
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {y}
            </a>
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        One row per payment actually sent. Work done by someone paid under
        another person&rsquo;s name is folded into that person&rsquo;s payment
        and itemized underneath, so the total matches the transfer while the
        hours stay attributed to whoever worked them.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Payments
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {payments.length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
            Combining others&rsquo; work
          </div>
          <div className="text-2xl font-bold text-purple-900 mt-1">
            {routed.length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Total paid out
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {fmt(yearTotal)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2 font-semibold text-gray-600">
                Paid to
              </th>
              <th className="text-left px-4 py-2 font-semibold text-gray-600">
                Pay Date
              </th>
              <th className="text-right px-4 py-2 font-semibold text-gray-600">
                Hours
              </th>
              <th className="text-right px-4 py-2 font-semibold text-gray-600">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  No payments recorded for {year}
                </td>
              </tr>
            )}
            {payments.map((p) => {
              const combined = p.lines.length > 1;
              return (
                <tr
                  key={p.key}
                  className={`border-b border-gray-100 ${combined ? "bg-purple-50/40" : ""}`}
                >
                  <td className="px-4 py-2 align-top">
                    <div className="font-medium text-gray-900">
                      {p.payeeName}
                    </div>
                    {combined && (
                      <div className="mt-1 space-y-0.5">
                        {p.lines.map((l) => (
                          <div
                            key={l.payPeriodId}
                            className="text-xs text-gray-500 flex items-center gap-1.5"
                          >
                            <span
                              className={
                                l.isOwnWork
                                  ? "text-gray-500"
                                  : "text-purple-600 font-medium"
                              }
                            >
                              {l.contractorName}
                              {l.isOwnWork ? "" : " (via payee)"}
                            </span>
                            <span className="text-gray-300">
                              {l.periodLabel}
                            </span>
                            <span className="text-gray-400">
                              {l.hours > 0 ? `${l.hours.toFixed(1)}h` : "—"}
                            </span>
                            <span className="text-gray-600">
                              {fmt(l.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top text-gray-600">
                    {p.payDate}
                  </td>
                  <td className="px-4 py-2 align-top text-right text-gray-600">
                    {p.totalHours > 0 ? `${p.totalHours.toFixed(1)}h` : "—"}
                  </td>
                  <td className="px-4 py-2 align-top text-right text-gray-900 font-medium">
                    {fmt(p.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td className="px-4 py-2 text-gray-700" colSpan={3}>
                Total
              </td>
              <td className="px-4 py-2 text-right text-gray-900">
                {fmt(yearTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
