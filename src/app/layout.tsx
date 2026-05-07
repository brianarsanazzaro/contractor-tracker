import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { checkAuth } from "./auth";
import { LoginForm } from "./login-form";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Contractor Tracker",
  description: "Track freelance contractor charges and timesheets",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isAuthenticated = await checkAuth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        {isAuthenticated ? (
          <>
            <nav className="bg-white border-b border-gray-200 px-6 py-3">
              <div className="flex items-center gap-8">
                <Link href="/" className="text-lg font-bold text-gray-900">
                  Contractor Tracker
                </Link>
                <div className="flex gap-6">
                  <Link
                    href="/"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/hours"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    All Hours
                  </Link>
                  <Link
                    href="/upload"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Upload Timesheet
                  </Link>
                  <Link
                    href="/contractors"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Contractors
                  </Link>
                  <Link
                    href="/analyze"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Analyze
                  </Link>
                  <Link
                    href="/manage"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Manage
                  </Link>
                  <Link
                    href="/import"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Import
                  </Link>
                </div>
              </div>
            </nav>
            <main className="flex-1 p-6">{children}</main>
          </>
        ) : (
          <LoginForm />
        )}
      </body>
    </html>
  );
}
