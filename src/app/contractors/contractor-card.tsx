"use client";

import { useState, useEffect } from "react";
import { terminateContractor } from "../actions";

interface PayHistoryItem {
  id: string;
  type: string;
  date: string;
  amount: number;
  previousRate: number | null;
  note: string | null;
}

interface ContractorData {
  id: string;
  name: string;
  hourlyRate: number;
  jobTitle: string;
  isActive: boolean;
  startDate: string | null;
  terminationDate: string | null;
  payHistory: PayHistoryItem[];
}

function computeDuration(startDateStr: string): string {
  const now = new Date();
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return "";

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}mo`);
  if (years === 0 && days > 0) parts.push(`${days}d`);

  return parts.join(" ") || "< 1 month";
}

export function ContractorCard({ contractor }: { contractor: ContractorData }) {
  const c = contractor;
  const raises = c.payHistory.filter((h) => h.type === "raise");
  const bonuses = c.payHistory.filter((h) => h.type === "bonus");
  const totalBonuses = bonuses.reduce((s, b) => s + b.amount, 0);
  const [confirming, setConfirming] = useState(false);
  const [duration, setDuration] = useState(() =>
    c.startDate ? computeDuration(c.startDate) : ""
  );

  useEffect(() => {
    if (!c.startDate) return;
    const interval = setInterval(() => {
      setDuration(computeDuration(c.startDate!));
    }, 60000);
    return () => clearInterval(interval);
  }, [c.startDate]);

  async function handleTerminate() {
    await terminateContractor(c.id);
    window.location.reload();
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{c.name}</h2>
            <span className="inline-block px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
              Active
            </span>
          </div>
          <p className="text-sm text-gray-500">{c.jobTitle}</p>
          {c.startDate && (
            <p className="text-xs text-gray-400 mt-0.5">
              Started {c.startDate}
              {duration && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                  {duration}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            ${c.hourlyRate.toFixed(2)}
            <span className="text-sm font-normal text-gray-400">/hr</span>
          </div>
          {totalBonuses > 0 && (
            <div className="text-xs text-amber-600 mt-1">
              ${totalBonuses.toLocaleString()} in bonuses
            </div>
          )}
          <div className="mt-2">
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Terminate
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTerminate}
                  className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {raises.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="text-xs font-semibold text-gray-500 mb-2">
            Rate History
          </div>
          <div className="flex flex-wrap gap-1.5">
            {raises.map((r, i) => (
              <div key={r.id} className="flex items-center gap-1 text-xs">
                <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium">
                  ${r.amount}/hr
                </span>
                <span className="text-gray-400">{r.date}</span>
                {r.note && (
                  <span className="text-gray-300">({r.note})</span>
                )}
                {i < raises.length - 1 && (
                  <span className="text-gray-300 mx-1">&rarr;</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {bonuses.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-semibold text-gray-500 mb-1.5">
            Bonuses
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bonuses.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-700 text-xs font-medium"
              >
                ${b.amount.toLocaleString()}
                <span className="text-amber-400 font-normal">
                  {b.date}
                  {b.note ? ` (${b.note})` : ""}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function InactiveContractorCard({
  contractor,
}: {
  contractor: ContractorData;
}) {
  const c = contractor;
  const startDuration =
    c.startDate && c.terminationDate
      ? computeDurationBetween(c.startDate, c.terminationDate)
      : c.startDate
        ? computeDuration(c.startDate)
        : "";

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 opacity-60">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-500 line-through">
              {c.name}
            </h2>
            <span className="inline-block px-2 py-0.5 rounded text-xs bg-red-100 text-red-600">
              Terminated {c.terminationDate || ""}
            </span>
          </div>
          <p className="text-sm text-gray-400">{c.jobTitle}</p>
          {c.startDate && (
            <p className="text-xs text-gray-400 mt-0.5">
              Started {c.startDate}
              {startDuration && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 font-medium">
                  worked {startDuration}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-400">
            ${c.hourlyRate.toFixed(2)}
            <span className="text-sm font-normal">/hr</span>
          </div>
        </div>
      </div>
      {c.payHistory.length > 0 && (
        <div className="mt-3 border-t border-gray-200 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {c.payHistory
              .filter((h) => h.type === "raise")
              .map((r, i, arr) => (
                <div
                  key={r.id}
                  className="flex items-center gap-1 text-xs text-gray-400"
                >
                  <span className="px-2 py-1 rounded bg-gray-100 font-medium">
                    ${r.amount}/hr
                  </span>
                  <span>{r.date}</span>
                  {i < arr.length - 1 && (
                    <span className="mx-1">&rarr;</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function computeDurationBetween(startStr: string, endStr: string): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}mo`);
  if (years === 0 && days > 0) parts.push(`${days}d`);

  return parts.join(" ") || "< 1 month";
}
