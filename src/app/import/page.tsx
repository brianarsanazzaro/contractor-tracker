import { ImportForm } from "./import-form";

export default function ImportPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Import Google Sheet CSV
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Import historical contractor data from Google Sheet CSV exports. Each
        year has a different column format.
      </p>
      <ImportForm />
    </div>
  );
}
