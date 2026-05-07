"use client";

import { useState, useEffect, useRef } from "react";
import { uploadClockifyCsv, addManualEntry } from "../actions";

interface Contractor {
  id: string;
  name: string;
  hourlyRate: number;
  jobTitle: string;
}

interface Category {
  id: string;
  name: string;
}

const STORAGE_KEY = "upload-form-saved";

interface SavedValues {
  mode: "clockify" | "manual";
  contractorId: string;
  startDate: string;
  endDate: string;
  processingDate: string;
  projectCategoryId: string;
}

function load(): SavedValues {
  if (typeof window === "undefined") return defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch {}
  return defaults();
}

function save(vals: Partial<SavedValues>) {
  try {
    const existing = load();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...vals }));
  } catch {}
}

function defaults(): SavedValues {
  return {
    mode: "clockify",
    contractorId: "",
    startDate: "",
    endDate: "",
    processingDate: "",
    projectCategoryId: "",
  };
}

export function UploadForm({
  contractors,
  categories,
}: {
  contractors: Contractor[];
  categories: Category[];
}) {
  const [saved, setSaved] = useState<SavedValues>(defaults);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSaved(load());
  }, []);

  function update(partial: Partial<SavedValues>) {
    setSaved((prev) => {
      const next = { ...prev, ...partial };
      save(next);
      return next;
    });
  }

  async function handleClockifySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await uploadClockifyCsv(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setStatus("Timesheet uploaded successfully!");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleManualSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await addManualEntry(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setStatus("Manual entry added successfully!");
    }
  }

  return (
    <div>
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => update({ mode: "clockify" })}
          className={`px-4 py-2 rounded text-sm font-medium ${
            saved.mode === "clockify"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 border border-gray-300"
          }`}
        >
          Upload Clockify CSV
        </button>
        <button
          onClick={() => update({ mode: "manual" })}
          className={`px-4 py-2 rounded text-sm font-medium ${
            saved.mode === "manual"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 border border-gray-300"
          }`}
        >
          Manual Entry
        </button>
      </div>

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

      {saved.mode === "clockify" ? (
        <form
          onSubmit={handleClockifySubmit}
          className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contractor
            </label>
            <select
              name="contractorId"
              required
              value={saved.contractorId}
              onChange={(e) => update({ contractorId: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Select contractor...</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (${c.hourlyRate}/hr)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period Start
              </label>
              <input
                type="date"
                name="startDate"
                required
                value={saved.startDate}
                onChange={(e) => update({ startDate: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period End
              </label>
              <input
                type="date"
                name="endDate"
                required
                value={saved.endDate}
                onChange={(e) => update({ endDate: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Processing Date
              </label>
              <input
                type="date"
                name="processingDate"
                required
                value={saved.processingDate}
                onChange={(e) => update({ processingDate: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clockify CSV Export
            </label>
            <input
              ref={fileRef}
              type="file"
              name="file"
              accept=".csv"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700"
            />
            <p className="text-xs text-gray-500 mt-1">
              Export from Clockify: Reports &rarr; Summary &rarr; Export &rarr;
              CSV
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700"
          >
            Upload & Process
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleManualSubmit}
          className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
        >
          <p className="text-sm text-gray-500 mb-2">
            For contractors who don&apos;t use Clockify — manually enter their
            hours and assign to a project.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contractor
            </label>
            <select
              name="contractorId"
              required
              value={saved.contractorId}
              onChange={(e) => update({ contractorId: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Select contractor...</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (${c.hourlyRate}/hr)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              name="projectCategoryId"
              required
              value={saved.projectCategoryId}
              onChange={(e) => update({ projectCategoryId: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Select project...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                name="startDate"
                required
                value={saved.startDate}
                onChange={(e) => update({ startDate: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date{" "}
                <span className="font-normal text-gray-400">(optional, for a range)</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={saved.endDate}
                onChange={(e) => update({ endDate: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                name="amount"
                step="0.01"
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hours{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="number"
                name="hours"
                step="0.01"
                placeholder="Leave blank if unknown"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              name="description"
              placeholder="e.g., 100% of work for Cloud Architect & Security"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700"
          >
            Add Entry
          </button>
        </form>
      )}
    </div>
  );
}
