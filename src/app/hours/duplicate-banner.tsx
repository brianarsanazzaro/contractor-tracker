"use client";

import { useState } from "react";
import { deletePayPeriod } from "../actions";

interface DuplicateGroup {
  contractorName: string;
  periods: {
    id: string;
    start: string;
    end: string;
    amount: number;
    source: string;
  }[];
}

function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

export function DuplicateBanner({
  duplicates,
}: {
  duplicates: DuplicateGroup[];
}) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  async function handleDelete(id: string) {
    setDeleting(id);
    await deletePayPeriod(id);
    setDeleted((prev) => new Set([...prev, id]));
    setDeleting(null);
  }

  const activeDuplicates = duplicates
    .map((d) => ({
      ...d,
      periods: d.periods.filter((p) => !deleted.has(p.id)),
    }))
    .filter((d) => d.periods.length > 1);

  if (activeDuplicates.length === 0) return null;

  return (
    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-red-600 font-semibold text-sm">
          Duplicate / Overlapping Pay Periods Detected
        </span>
      </div>
      <div className="space-y-4">
        {activeDuplicates.map((d) => (
          <div key={d.contractorName}>
            <div className="text-sm font-medium text-red-700 mb-1.5">
              {d.contractorName}
            </div>
            <div className="space-y-1">
              {d.periods.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 text-sm bg-white rounded px-3 py-1.5 border border-red-100"
                >
                  <span className="font-medium text-gray-700 min-w-[140px]">
                    {p.start} — {p.end}
                  </span>
                  <span className="text-gray-900 min-w-[80px]">
                    {fmt(p.amount)}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      p.source === "clockify"
                        ? "bg-green-100 text-green-700"
                        : p.source === "sheet-import"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {p.source}
                  </span>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deleting === p.id}
                    className="ml-auto text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50"
                  >
                    {deleting === p.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
