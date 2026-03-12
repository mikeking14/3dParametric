"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="mb-8 text-center text-3xl font-bold">Log In</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-300">Email</label>
          <input
            type="email"
            name="email"
            required
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-300">Password</label>
          <input
            type="password"
            name="password"
            required
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-900/50 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Don&apos;t have an account?{" "}
        <a href="/register" className="text-blue-400 hover:underline">
          Register
        </a>
      </p>
    </div>
  );
}
