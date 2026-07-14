import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

const ERRORS: Record<string, string> = {
  denied:
    "That Google account doesn't have access. Ask an admin to add your email, then try again.",
  unverified:
    "That Google account's email address isn't verified, so it can't be used to sign in.",
  failed: "Sign-in didn't complete. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSession()) redirect("/");

  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? ERRORS.failed) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-lg border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          Contractor Tracker
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Private. Sign in with an approved Google account.
        </p>

        {message && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {message}
          </div>
        )}

        <a
          href="/api/auth/signin"
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z"
            />
          </svg>
          Sign in with Google
        </a>
      </div>
    </div>
  );
}
