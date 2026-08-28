import { getAllContractors, addContractor } from "../actions";
import { redirect } from "next/navigation";
import { ContractorCard, InactiveContractorCard } from "./contractor-card";

export default async function ContractorsPage() {
  const contractors = await getAllContractors();
  const active = contractors.filter((c) => c.isActive);
  const inactive = contractors.filter((c) => !c.isActive);

  // Only people who are themselves paid directly can act as a payee — payment
  // routing is one hop, so chains never form.
  const payeeOptions = active
    .filter((c) => !c.paidToId)
    .map((c) => ({ id: c.id, name: c.name }));

  // People whose pay is routed through someone else show up as line items on
  // that person's card rather than as cards of their own.
  const activeIds = new Set(active.map((c) => c.id));
  const routedByPayee = new Map<string, typeof active>();
  for (const c of active) {
    if (!c.paidToId || !activeIds.has(c.paidToId)) continue;
    const list = routedByPayee.get(c.paidToId) ?? [];
    list.push(c);
    routedByPayee.set(c.paidToId, list);
  }
  const topLevel = active.filter(
    (c) => !c.paidToId || !activeIds.has(c.paidToId)
  );

  async function handleAdd(formData: FormData) {
    "use server";
    const result = await addContractor(formData);
    if (result.success) redirect("/contractors");
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Contractors</h1>

      <div className="space-y-4 mb-8">
        {topLevel.map((c) => (
          <ContractorCard
            key={c.id}
            contractor={c}
            payeeOptions={payeeOptions}
            routedContractors={routedByPayee.get(c.id) ?? []}
          />
        ))}

        {inactive.map((c) => (
          <InactiveContractorCard key={c.id} contractor={c} />
        ))}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Add Contractor
      </h2>
      <form
        action={handleAdd}
        className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
      >
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Title
            </label>
            <input
              type="text"
              name="jobTitle"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hourly Rate ($)
            </label>
            <input
              type="number"
              name="hourlyRate"
              step="0.01"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paid to
            </label>
            <select
              name="paidToId"
              defaultValue=""
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Themselves (direct)</option>
              {payeeOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Hours stay on this person; only the payment is routed.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Routing since
            </label>
            <input
              type="date"
              name="paidToStartDate"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Routing note
            </label>
            <input
              type="text"
              name="paidToNote"
              placeholder="For accounting"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personal email
            </label>
            <input
              type="email"
              name="personalEmail"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contractor email
            </label>
            <input
              type="email"
              name="workEmail"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contractor password
            </label>
            <input
              type="text"
              name="workPassword"
              autoComplete="off"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-gray-700">
            <input type="checkbox" name="hasCompanyCard" />
            Has a company card
          </label>
          <input
            type="text"
            name="companyCardNote"
            placeholder="Card note (last 4, issued...)"
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700 text-sm"
        >
          Add Contractor
        </button>
      </form>
    </div>
  );
}
