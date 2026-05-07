"use client";

import { useState } from "react";
import { importGoogleSheetCsv, type SheetImportResult } from "../actions";

export function ImportForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SheetImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);

      // The checkbox value needs special handling
      const clearCheckbox = (e.currentTarget.elements.namedItem("clearExistingCheck") as HTMLInputElement);
      if (clearCheckbox?.checked) {
        formData.set("clearExisting", "true");
      } else {
        formData.set("clearExisting", "false");
      }

      const res = await importGoogleSheetCsv(formData);

      if (res.error) {
        setError(res.error);
      } else {
        setResult(res);
        setStatus("Import completed successfully!");
        (e.target as HTMLFormElement).reset();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {status && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
          {status}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {result && result.success && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Import Summary
          </h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {result.deletedPayPeriods > 0 && (
              <>
                <dt className="text-gray-500">Previous records cleared</dt>
                <dd className="text-gray-900 font-medium">
                  {result.deletedPayPeriods} pay periods
                </dd>
              </>
            )}
            <dt className="text-gray-500">Contractors created</dt>
            <dd className="text-gray-900 font-medium">
              {result.contractorsCreated}
            </dd>
            <dt className="text-gray-500">Pay periods imported</dt>
            <dd className="text-gray-900 font-medium">
              {result.payPeriodsCreated}
            </dd>
            <dt className="text-gray-500">Time entries created</dt>
            <dd className="text-gray-900 font-medium">
              {result.timeEntriesCreated}
            </dd>
            <dt className="text-gray-500">Total amount</dt>
            <dd className="text-gray-900 font-medium">
              $
              {result.totalAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </dd>
            <dt className="text-gray-500">Rows skipped</dt>
            <dd className="text-gray-900 font-medium">
              {result.skippedRows}
            </dd>
          </dl>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg border border-gray-200 p-6 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CSV Format / Year
          </label>
          <select
            name="format"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">Select format...</option>
            <option value="2026">
              2026 — &quot;2026 dev hours.csv&quot; format
            </option>
            <option value="2025">
              2025 — &quot;2025 dev hours.csv&quot; format
            </option>
            <option value="2024">
              2024 — &quot;2024 YTD all freelance hours.csv&quot; format
            </option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Each year has a different column layout. Make sure you select the
            matching format.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CSV File
          </label>
          <input
            type="file"
            name="file"
            accept=".csv"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700"
          />
          <p className="text-xs text-gray-500 mt-1">
            Export from Google Sheets: File &rarr; Download &rarr; Comma
            Separated Values (.csv)
          </p>
        </div>

        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded">
          <input
            type="checkbox"
            name="clearExistingCheck"
            id="clearExistingCheck"
            className="mt-0.5 rounded border-gray-300"
          />
          <label
            htmlFor="clearExistingCheck"
            className="text-sm text-amber-800"
          >
            <span className="font-medium">Clear existing data</span> — Delete
            all previously imported sheet data for the selected year before
            importing. This only affects records with source
            &quot;sheet-import&quot; and will not touch Clockify or manual
            entries.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Importing..." : "Import CSV"}
        </button>
      </form>
    </div>
  );
}
