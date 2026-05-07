"use client";

import { useState } from "react";
import { login } from "./auth";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await login(formData);
    if (result.error) {
      setError(result.error);
    } else {
      window.location.reload();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          Contractor Tracker
        </h1>
        <p className="text-sm text-gray-500 mb-6">Enter password to continue</p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            autoFocus
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700 text-sm"
          >
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}
