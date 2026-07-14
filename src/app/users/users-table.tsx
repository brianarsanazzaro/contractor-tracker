"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addUser, removeUser, setUserRole } from "./actions";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  lastLoginAt: string | null;
};

export function UserRow({ user, isSelf }: { user: User; isSelf: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleRemove() {
    if (
      !confirm(`Remove ${user.email}? They'll lose access immediately.`)
    ) {
      return;
    }
    run(() => removeUser(user.id));
  }

  const nextRole = user.role === "admin" ? "user" : "admin";

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="px-4 py-3 text-gray-900">
        {user.email}
        {isSelf && <span className="text-gray-400 ml-2">(you)</span>}
        {user.name && (
          <div className="text-xs text-gray-500">{user.name}</div>
        )}
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
            user.role === "admin"
              ? "bg-blue-50 text-blue-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {user.role === "admin" ? "Admin" : "User"}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-500">
        {user.lastLoginAt ?? (
          <span className="text-gray-400">Never signed in</span>
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {!isSelf && (
          <>
            <button
              onClick={() => run(() => setUserRole(user.id, nextRole))}
              disabled={pending}
              className="text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Make {nextRole}
            </button>
            <button
              onClick={handleRemove}
              disabled={pending}
              className="text-xs text-red-600 hover:text-red-800 ml-4 disabled:opacity-50"
            >
              Remove
            </button>
          </>
        )}
      </td>
    </tr>
  );
}

export function AddUserForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await addUser(formData);
      if (result.error) {
        setError(result.error);
      } else {
        form.reset();
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Google email address
          </label>
          <input
            type="email"
            name="email"
            required
            placeholder="name@behindthechair.com"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            name="role"
            defaultValue="user"
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700 text-sm disabled:opacity-50"
        >
          {pending ? "Adding..." : "Add User"}
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        They must sign in with this exact Google account. Admins can manage the
        user list; users can only view and edit tracker data.
      </p>
    </form>
  );
}
