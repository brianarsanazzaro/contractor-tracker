import { getMonthlySpend } from "../actions";

function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export default async function AnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = parseInt(params.year || "2026");
  const { months, grandTotal } = await getMonthlySpend(year);

  const max = Math.max(...months.map((m) => m.total), 0);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Monthly Spend — {year}
        </h1>
        <div className="flex gap-2">
          {[2024, 2025, 2026].map((y) => (
            <a
              key={y}
              href={`/analyze?year=${y}`}
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

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2 font-semibold text-gray-600">
                Month
              </th>
              <th className="text-right px-4 py-2 font-semibold text-gray-600">
                Total Spend
              </th>
              <th className="text-right px-4 py-2 font-semibold text-gray-600">
                % of Year
              </th>
              <th className="text-left px-4 py-2 font-semibold text-gray-600 w-1/2">
                &nbsp;
              </th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => {
              const pct = grandTotal > 0 ? (m.total / grandTotal) * 100 : 0;
              const barPct = max > 0 ? (m.total / max) * 100 : 0;
              return (
                <tr key={m.month} className="border-b border-gray-100">
                  <td className="px-4 py-2 text-gray-700">{m.month}</td>
                  <td className="px-4 py-2 text-right text-gray-900 font-medium">
                    {fmt(m.total)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {pct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${barPct}%` }}
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
                {fmt(grandTotal)}
              </td>
              <td className="px-4 py-2 text-right text-gray-500">100%</td>
              <td className="px-4 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
