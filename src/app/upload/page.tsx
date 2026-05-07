import { getContractors, getProjectCategories } from "../actions";
import { UploadForm } from "./upload-form";

export default async function UploadPage() {
  const [contractors, categories] = await Promise.all([
    getContractors(),
    getProjectCategories(),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Upload Timesheet
      </h1>
      <UploadForm contractors={contractors} categories={categories} />
    </div>
  );
}
