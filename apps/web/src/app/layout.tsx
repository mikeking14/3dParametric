import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parametric Marketplace",
  description: "Buy and customize parametric 3D models",
};

async function NavAuth() {
  const session = await getSession();

  if (session.userId) {
    return (
      <>
        <a href="/dashboard" className="text-gray-400 hover:text-white">
          Dashboard
        </a>
        <form action="/api/auth/logout" method="POST" className="inline">
          <button
            type="submit"
            className="text-gray-400 hover:text-white"
          >
            Logout
          </button>
        </form>
        <span className="text-sm text-gray-500">{session.displayName}</span>
      </>
    );
  }

  return (
    <>
      <a href="/login" className="text-gray-400 hover:text-white">
        Log In
      </a>
      <a
        href="/register"
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-500"
      >
        Sign Up
      </a>
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        <header className="border-b border-gray-800 px-6 py-4">
          <nav className="mx-auto flex max-w-7xl items-center justify-between">
            <a href="/" className="text-xl font-bold">
              Parametric Marketplace
            </a>
            <div className="flex items-center gap-4">
              <a href="/browse" className="text-gray-400 hover:text-white">
                Browse
              </a>
              <a href="/upload" className="text-gray-400 hover:text-white">
                Upload
              </a>
              <NavAuth />
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
