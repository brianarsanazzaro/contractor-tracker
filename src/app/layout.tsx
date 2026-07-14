import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/auth";

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
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/hours", label: "All Hours" },
  { href: "/upload", label: "Upload Timesheet" },
  { href: "/contractors", label: "Contractors" },
  { href: "/access", label: "Access" },
  { href: "/analyze", label: "Analyze" },
  { href: "/manage", label: "Manage" },
  { href: "/import", label: "Import" },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        {session ? (
          <>
            <nav className="bg-white border-b border-gray-200 px-6 py-3 print:hidden">
              <div className="flex items-center gap-8">
                <Link href="/" className="text-lg font-bold text-gray-900">
                  Contractor Tracker
                </Link>
                <div className="flex gap-6">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      {link.label}
                    </Link>
                  ))}
                  {session.role === "admin" && (
                    <Link
                      href="/users"
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Users
                    </Link>
                  )}
                </div>

                <div className="ml-auto flex items-center gap-3">
                  <span className="text-sm text-gray-500">{session.email}</span>
                  <form action="/api/auth/signout" method="post">
                    <button
                      type="submit"
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            </nav>
            <main className="flex-1 p-6">{children}</main>
          </>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
