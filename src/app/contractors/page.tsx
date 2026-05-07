import { getAllContractors, addContractor } from "../actions";
import { redirect } from "next/navigation";
import { ContractorCard, InactiveContractorCard } from "./contractor-card";

export default async function ContractorsPage() {
  const contractors = await getAllContractors();
  const active = contractors.filter((c) => c.isActive);
  const inactive = contractors.filter((c) => !c.isActive);

  async function handleAdd(formData: FormData) {
    "use server";
    const result = await addContractor(formData);
    if (result.success) redirect("/contractors");
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Contractors</h1>

      <div className="space-y-4 mb-8">
        {active.map((c) => (
          <ContractorCard key={c.id} contractor={c} />
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
