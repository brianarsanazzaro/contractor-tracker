import { ADMIN_EMAIL, requireAdmin } from "@/lib/auth";
import { listUsers } from "./actions";
import { AddUserForm, UserRow } from "./users-table";

export default async function UsersPage() {
  const admin = await requireAdmin();
  const users = await listUsers();

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Users</h1>
      <p className="text-sm text-gray-500 mb-6">
        Only the people listed here can sign in. Everyone else is turned away at
        the Google login screen.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left font-medium text-gray-600 px-4 py-2.5">
                Email
              </th>
              <th className="text-left font-medium text-gray-600 px-4 py-2.5">
                Role
              </th>
              <th className="text-left font-medium text-gray-600 px-4 py-2.5">
                Last sign-in
              </th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-3 text-gray-900">
                {ADMIN_EMAIL}
                {admin.email === ADMIN_EMAIL && (
                  <span className="text-gray-400 ml-2">(you)</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="inline-block bg-blue-50 text-blue-700 rounded px-2 py-0.5 text-xs font-medium">
                  Admin
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400">&mdash;</td>
              <td className="px-4 py-3 text-right text-xs text-gray-400">
                Built-in, can&rsquo;t be removed
              </td>
            </tr>

            {users.map((user) => (
              <UserRow
                key={user.id}
                user={{
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  role: user.role,
                  lastLoginAt: user.lastLoginAt
                    ? user.lastLoginAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : null,
                }}
                isSelf={user.email === admin.email}
              />
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No other users yet. Add someone below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Add User</h2>
      <AddUserForm />
    </div>
  );
}
