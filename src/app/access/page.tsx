import {
  getAccessOverview,
  addSharedAccount,
  deleteSharedAccount,
  grantAccess,
  revokeAccess,
  revokeAllForContractor,
} from "./actions";
import { isSafeHttpUrl } from "@/lib/safe-url";

// "YYYY-MM-DD" → "Jul 14, 2026" without timezone shift
function fmtDate(s: string): string {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  return new Date(
    parseInt(m[1]),
    parseInt(m[2]) - 1,
    parseInt(m[3])
  ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AccessPage() {
  const { accounts, contractors } = await getAccessOverview();
  const today = new Date().toLocaleDateString("en-CA");

  // Offboarding view: contractors that still hold active access
  const byContractor = contractors
    .map((c) => ({
      contractor: c,
      grants: accounts.flatMap((a) =>
        a.access
          .filter((x) => x.contractorId === c.id && !x.revokedDate)
          .map((x) => ({ ...x, accountName: a.name }))
      ),
    }))
    .filter((c) => c.grants.length > 0);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Account Access</h1>
      <p className="text-sm text-gray-500 mb-6">
        Track which accounts each contractor has credentials for, so you know
        exactly which passwords to rotate when someone leaves. Passwords
        themselves are never stored here.
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Who has access right now
      </h2>
      {byContractor.length === 0 ? (
        <p className="text-sm text-gray-500 mb-8">
          No active access recorded yet. Add accounts below, then grant access
          to contractors.
        </p>
      ) : (
        <div className="space-y-3 mb-8">
          {byContractor.map(({ contractor, grants }) => (
            <div
              key={contractor.id}
              className="bg-white rounded-lg border border-gray-200 p-4 flex items-start justify-between gap-4"
            >
              <div>
                <div className="font-medium text-gray-900">
                  {contractor.name}
                  {!contractor.isActive && (
                    <span className="ml-2 text-xs font-normal text-red-600 bg-red-50 px-2 py-0.5 rounded">
                      terminated — rotate these passwords
                    </span>
                  )}
                </div>
                <ul className="mt-1 text-sm text-gray-600">
                  {grants.map((g) => (
                    <li key={g.id}>
                      {g.accountName}
                      <span className="text-gray-400">
                        {" "}
                        — since {fmtDate(g.grantedDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <form action={revokeAllForContractor}>
                <input type="hidden" name="contractorId" value={contractor.id} />
                <button
                  type="submit"
                  className="text-sm border border-red-300 text-red-700 hover:bg-red-50 rounded px-3 py-1.5 whitespace-nowrap"
                >
                  Mark all revoked
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Shared accounts
      </h2>
      <div className="space-y-4 mb-8">
        {accounts.map((account) => {
          const active = account.access.filter((x) => !x.revokedDate);
          const revoked = account.access.filter((x) => x.revokedDate);
          return (
            <div
              key={account.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-gray-900">{account.name}</div>
                  <div className="text-sm text-gray-500">
                    {account.username && <span>{account.username}</span>}
                    {account.username && account.url && <span> · </span>}
                    {account.url &&
                      (isSafeHttpUrl(account.url) ? (
                        <a
                          href={account.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {account.url}
                        </a>
                      ) : (
                        // Not a link: a non-http(s) URL would run as script on click.
                        <span>{account.url}</span>
                      ))}
                    {account.note && (
                      <span className="block text-gray-400">{account.note}</span>
                    )}
                  </div>
                </div>
                {account.access.length === 0 && (
                  <form action={deleteSharedAccount}>
                    <input type="hidden" name="id" value={account.id} />
                    <button
                      type="submit"
                      className="text-xs text-gray-400 hover:text-red-600"
                    >
                      delete
                    </button>
                  </form>
                )}
              </div>

              {active.length > 0 && (
                <ul className="mt-3 divide-y divide-gray-100">
                  {active.map((x) => (
                    <li
                      key={x.id}
                      className="flex items-center justify-between py-1.5 text-sm"
                    >
                      <span>
                        <span className="text-gray-900">{x.contractor.name}</span>
                        {!x.contractor.isActive && (
                          <span className="ml-2 text-xs text-red-600">
                            terminated
                          </span>
                        )}
                        <span className="text-gray-400">
                          {" "}
                          — granted {fmtDate(x.grantedDate)}
                          {x.note && ` · ${x.note}`}
                        </span>
                      </span>
                      <form action={revokeAccess}>
                        <input type="hidden" name="id" value={x.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-600 hover:underline"
                        >
                          revoke
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              {revoked.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer">
                    {revoked.length} revoked
                  </summary>
                  <ul className="mt-1 text-xs text-gray-400">
                    {revoked.map((x) => (
                      <li key={x.id}>
                        {x.contractor.name} — {fmtDate(x.grantedDate)} to{" "}
                        {fmtDate(x.revokedDate!)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <form
                action={grantAccess}
                className="mt-3 pt-3 border-t border-gray-100 flex items-end gap-3"
              >
                <input type="hidden" name="accountId" value={account.id} />
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Grant access to
                  </label>
                  <select
                    name="contractorId"
                    required
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">Select contractor…</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {!c.isActive ? " (inactive)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Date given
                  </label>
                  <input
                    type="date"
                    name="grantedDate"
                    defaultValue={today}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    name="note"
                    placeholder="e.g. shared via 1Password"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm font-medium hover:bg-blue-700"
                >
                  Grant
                </button>
              </form>
            </div>
          );
        })}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Add account</h2>
      <form
        action={addSharedAccount}
        className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account name
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. WordPress admin, Mailchimp"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Login username / email (optional)
            </label>
            <input
              type="text"
              name="username"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Login URL (optional)
            </label>
            <input
              type="url"
              name="url"
              placeholder="https://…"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              name="note"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700 text-sm"
        >
          Add Account
        </button>
      </form>
    </div>
  );
}
