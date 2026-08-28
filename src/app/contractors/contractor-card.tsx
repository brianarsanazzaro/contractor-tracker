"use client";

import { useState, useEffect } from "react";
import {
  terminateContractor,
  setContractorPayee,
  setContractorDetails,
} from "../actions";

interface PayHistoryItem {
  id: string;
  type: string;
  date: string;
  amount: number;
  previousRate: number | null;
  note: string | null;
}

export interface PayeeOption {
  id: string;
  name: string;
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
  paidToId: string | null;
  paidToStartDate: string | null;
  paidToNote: string | null;
  paidTo: PayeeOption | null;
  personalEmail: string | null;
  workEmail: string | null;
  workPassword: string | null;
  hasCompanyCard: boolean;
  companyCardNote: string | null;
  paidFor: { id: string; name: string; isActive: boolean }[];
}

// Editor for who actually receives this contractor's money. Hours and rate
// always stay on the contractor's own record — only the payment moves.
function PayeeControl({
  contractor,
  payeeOptions,
}: {
  contractor: ContractorData;
  payeeOptions: PayeeOption[];
}) {
  const c = contractor;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Someone who receives pay for others can't be routed away themselves.
  const receivesForOthers = c.paidFor.length > 0;
  const options = payeeOptions.filter((o) => o.id !== c.id);

  async function handleSave(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = await setContractorPayee(formData);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    window.location.reload();
  }

  if (editing) {
    return (
      <form action={handleSave} className="mt-3 border-t border-gray-100 pt-3">
        <input type="hidden" name="contractorId" value={c.id} />
        <div className="text-xs font-semibold text-gray-500 mb-2">
          Payment routing
        </div>
        <div className="grid grid-cols-3 gap-2">
          <select
            name="paidToId"
            defaultValue={c.paidToId || ""}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="">Paid directly (own name)</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                Paid via {o.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="paidToStartDate"
            defaultValue={c.paidToStartDate || ""}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
            title="When this arrangement began"
          />
          <input
            type="text"
            name="paidToNote"
            defaultValue={c.paidToNote || ""}
            placeholder="Note for accounting"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        {error && (
          <div className="mt-2 text-xs text-red-600">{error}</div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="text-xs px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 flex items-start justify-between gap-3">
      <div className="text-xs">
        {c.paidTo ? (
          <>
            <span className="inline-block px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
              Paid via {c.paidTo.name}
            </span>
            <span className="text-gray-400 ml-2">
              {c.paidToStartDate ? `since ${c.paidToStartDate}` : ""}
              {c.paidToNote ? ` · ${c.paidToNote}` : ""}
            </span>
          </>
        ) : receivesForOthers ? (
          <span className="inline-block px-2 py-0.5 rounded bg-purple-50 text-purple-600 font-medium">
            Receives payment for:{" "}
            {c.paidFor.map((p) => p.name).join(", ")}
          </span>
        ) : (
          <span className="text-gray-400">Paid directly under own name</span>
        )}
      </div>
      {!receivesForOthers && (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-gray-400 hover:text-blue-600 whitespace-nowrap"
        >
          {c.paidTo ? "Change" : "Route pay"}
        </button>
      )}
    </div>
  );
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

// Emails, work-account credentials and company-card status. The password is
// masked until the user asks to see it — it is stored in plain text.
function DetailsControl({ contractor }: { contractor: ContractorData }) {
  const c = contractor;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [hasCard, setHasCard] = useState(c.hasCompanyCard);

  async function handleSave(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = await setContractorDetails(formData);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    window.location.reload();
  }

  if (editing) {
    return (
      <form action={handleSave} className="mt-3 border-t border-gray-100 pt-3">
        <input type="hidden" name="contractorId" value={c.id} />
        <div className="text-xs font-semibold text-gray-500 mb-2">
          Contact &amp; accounts
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="email"
            name="personalEmail"
            defaultValue={c.personalEmail || ""}
            placeholder="Personal email"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
          <input
            type="email"
            name="workEmail"
            defaultValue={c.workEmail || ""}
            placeholder="Contractor email"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
          <input
            type="text"
            name="workPassword"
            defaultValue={c.workPassword || ""}
            placeholder="Contractor password (if known)"
            autoComplete="off"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="checkbox"
              name="hasCompanyCard"
              defaultChecked={c.hasCompanyCard}
              onChange={(e) => setHasCard(e.target.checked)}
            />
            Has a company card
          </label>
          {hasCard && (
            <input
              type="text"
              name="companyCardNote"
              defaultValue={c.companyCardNote || ""}
              placeholder="Card note (last 4, issued, limit...)"
              className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          )}
        </div>
        {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="text-xs px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
              setHasCard(c.hasCompanyCard);
            }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  const nothingRecorded =
    !c.personalEmail && !c.workEmail && !c.workPassword && !c.hasCompanyCard;

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 flex items-start justify-between gap-3">
      <div className="text-xs space-y-1 min-w-0">
        {nothingRecorded ? (
          <span className="text-gray-400">No contact details on file</span>
        ) : (
          <>
            {c.personalEmail && (
              <div className="text-gray-500">
                <span className="text-gray-400">Personal:</span>{" "}
                <span className="font-medium text-gray-700">
                  {c.personalEmail}
                </span>
              </div>
            )}
            {c.workEmail && (
              <div className="text-gray-500">
                <span className="text-gray-400">Contractor:</span>{" "}
                <span className="font-medium text-gray-700">{c.workEmail}</span>
                {c.workPassword && (
                  <>
                    <span className="text-gray-300 mx-1.5">·</span>
                    <span className="font-mono text-gray-600">
                      {showPassword ? c.workPassword : "••••••••"}
                    </span>
                    <button
                      onClick={() => setShowPassword((v) => !v)}
                      className="ml-1.5 text-gray-400 hover:text-blue-600"
                    >
                      {showPassword ? "hide" : "show"}
                    </button>
                  </>
                )}
              </div>
            )}
            {!c.workEmail && c.workPassword && (
              <div className="text-gray-500">
                <span className="text-gray-400">Password:</span>{" "}
                <span className="font-mono text-gray-600">
                  {showPassword ? c.workPassword : "••••••••"}
                </span>
                <button
                  onClick={() => setShowPassword((v) => !v)}
                  className="ml-1.5 text-gray-400 hover:text-blue-600"
                >
                  {showPassword ? "hide" : "show"}
                </button>
              </div>
            )}
            {c.hasCompanyCard && (
              <div>
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                  Company card
                </span>
                {c.companyCardNote && (
                  <span className="text-gray-400 ml-2">
                    {c.companyCardNote}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-gray-400 hover:text-blue-600 whitespace-nowrap"
      >
        {nothingRecorded ? "Add details" : "Edit details"}
      </button>
    </div>
  );
}

// A person whose pay is routed through this contractor, shown as a line item
// on the payee's card instead of getting a card of its own.
function RoutedContractorRow({
  contractor,
  payeeOptions,
}: {
  contractor: ContractorData;
  payeeOptions: PayeeOption[];
}) {
  const c = contractor;
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  async function handleTerminate() {
    await terminateContractor(c.id);
    window.location.reload();
  }

  return (
    <div className="py-2 pl-3 border-l-2 border-purple-100">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-gray-800">{c.name}</span>
            <span className="text-xs text-gray-400 truncate">{c.jobTitle}</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {c.startDate ? `Started ${c.startDate}` : ""}
            {c.paidToStartDate ? ` · routed since ${c.paidToStartDate}` : ""}
            {c.paidToNote ? ` · ${c.paidToNote}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-3 whitespace-nowrap">
          <span className="text-sm font-semibold text-gray-700">
            ${c.hourlyRate.toFixed(2)}
            <span className="text-xs font-normal text-gray-400">/hr</span>
          </span>
          {c.hasCompanyCard && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
              Card
            </span>
          )}
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="text-xs text-gray-400 hover:text-blue-600"
          >
            Details
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-xs text-gray-400 hover:text-blue-600"
          >
            {editing ? "Close" : "Routing"}
          </button>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              Terminate
            </button>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
      {showDetails && <DetailsControl contractor={c} />}
      {editing && (
        <PayeeControl contractor={c} payeeOptions={payeeOptions} />
      )}
    </div>
  );
}

export function ContractorCard({
  contractor,
  payeeOptions,
  routedContractors = [],
}: {
  contractor: ContractorData;
  payeeOptions: PayeeOption[];
  routedContractors?: ContractorData[];
}) {
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
            {c.paidTo && (
              <span className="inline-block px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                Paid via {c.paidTo.name}
              </span>
            )}
            {c.hasCompanyCard && (
              <span className="inline-block px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700">
                Company card
              </span>
            )}
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

      <DetailsControl contractor={c} />

      <PayeeControl contractor={c} payeeOptions={payeeOptions} />

      {routedContractors.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="text-xs font-semibold text-gray-500 mb-1">
            Paid through {c.name}
          </div>
          <div className="divide-y divide-gray-100">
            {routedContractors.map((r) => (
              <RoutedContractorRow
                key={r.id}
                contractor={r}
                payeeOptions={payeeOptions}
              />
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
            {c.paidTo && (
              <span className="inline-block px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-500">
                Was paid via {c.paidTo.name}
              </span>
            )}
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
