"use client";

import { useState } from "react";
import { bulkDeletePayPeriods } from "../actions";

interface Period {
  id: string;
  contractorName: string;
  startDate: string;
  endDate: string;
  processingDate: string;
  amount: number;
  hours: number;
  source: string;
}

function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

export function ManageTable({ periods }: { periods: Period[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterContractor, setFilterContractor] = useState<string>("all");
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  const contractors = [...new Set(periods.map((p) => p.contractorName))].sort();
  const sources = [...new Set(periods.map((p) => p.source))].sort();

  const filtered = periods.filter((p) => {
    if (deleted.has(p.id)) return false;
    if (filterSource !== "all" && p.source !== filterSource) return false;
    if (filterContractor !== "all" && p.contractorName !== filterContractor)
      return false;
    return true;
  });

  const allSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    setDeleting(true);
    const result = await bulkDeletePayPeriods([...selected]);
    if (result.success) {
      setDeleted((prev) => new Set([...prev, ...selected]));
      setSelected(new Set());
    }
    setDeleting(false);
  }

  const selectedAmount = filtered
    .filter((p) => selected.has(p.id))
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Source:</label>
          <select
            value={filterSource}
            onChange={(e) => {
              setFilterSource(e.target.value);
              setSelected(new Set());
            }}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Contractor:</label>
          <select
            value={filterContractor}
            onChange={(e) => {
              setFilterContractor(e.target.value);
              setSelected(new Set());
            }}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            {contractors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-gray-400">
          {filtered.length} records
          {filterSource !== "all" || filterContractor !== "all"
            ? " (filtered)"
            : ""}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm text-red-700">
            <span className="font-semibold">{selected.size}</span> selected
            &middot; {fmt(selectedAmount)} total
          </div>
          <button
            onClick={handleBulkDelete}
            disabled={deleting}
            className="px-4 py-1.5 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {deleting
              ? "Deleting..."
              : `Delete ${selected.size} record${selected.size > 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">
                Contractor
              </th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">
                Period
              </th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">
                Pay Date
              </th>
              <th className="text-right px-3 py-2 font-semibold text-gray-600">
                Hours
              </th>
              <th className="text-right px-3 py-2 font-semibold text-gray-600">
                Amount
              </th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-8 text-gray-400"
                >
                  No records found
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr
                key={p.id}
                className={`border-b border-gray-100 ${selected.has(p.id) ? "bg-red-50" : "hover:bg-gray-50"}`}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-3 py-2 font-medium text-gray-900">
                  {p.contractorName}
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {p.startDate} — {p.endDate}
                </td>
                <td className="px-3 py-2 text-gray-600">{p.processingDate}</td>
                <td className="px-3 py-2 text-right text-gray-600">
                  {p.hours > 0 ? `${p.hours.toFixed(1)}h` : "—"}
                </td>
                <td className="px-3 py-2 text-right text-gray-900 font-medium">
                  {fmt(p.amount)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                      p.source === "clockify"
                        ? "bg-green-100 text-green-700"
                        : p.source === "sheet-import"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {p.source}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
