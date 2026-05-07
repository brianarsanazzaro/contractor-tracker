import {
  getDashboardData,
  getMissingPayPeriods,
  getDuplicatePayPeriods,
} from "../actions";
import { DashboardTable } from "./dashboard-table";
import { DuplicateBanner } from "./duplicate-banner";

export default async function HoursPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = parseInt(params.year || String(new Date().getFullYear()));
  const [data, missingData, duplicates] = await Promise.all([
    getDashboardData(year),
    getMissingPayPeriods(year),
    getDuplicatePayPeriods(year),
  ]);
  const missingPeriods = missingData.periods;
  const activeContractorCount = missingData.activeContractorCount;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Freelance Contractor Charges — {year} YTD
        </h1>
        <div className="flex gap-2">
          {[2024, 2025, 2026].map((y) => (
            <a
              key={y}
              href={`/hours?year=${y}`}
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

      {duplicates.length > 0 && <DuplicateBanner duplicates={duplicates} />}

      {missingPeriods.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 font-semibold text-sm">
                Missing Pay Periods ({missingPeriods.length})
              </span>
              <span className="text-xs text-amber-500">
                Biweekly: Wed — Tue, paid following Wed
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            {missingPeriods.map((p, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="font-medium text-amber-700 whitespace-nowrap min-w-[160px]">
                  {p.start} — {p.end}
                </span>
                <span className="text-amber-500 text-xs whitespace-nowrap min-w-[80px]">
                  pay {p.payDate}
                </span>
                <span className="text-amber-600 text-xs">
                  {p.missingContractors.length >= activeContractorCount
                    ? "All contractors"
                    : p.missingContractors.join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <DashboardTable data={data} year={year} />
    </div>
  );
}
