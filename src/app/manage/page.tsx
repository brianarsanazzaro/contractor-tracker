import { getPayPeriodList } from "../actions";
import { ManageTable } from "./manage-table";

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = parseInt(params.year || String(new Date().getFullYear()));
  const periods = await getPayPeriodList(year);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Manage Pay Periods — {year}
        </h1>
        <div className="flex gap-2">
          {[2024, 2025, 2026].map((y) => (
            <a
              key={y}
              href={`/manage?year=${y}`}
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
      <ManageTable periods={periods} />
    </div>
  );
}
