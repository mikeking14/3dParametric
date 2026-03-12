"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
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
    const displayName = formData.get("displayName") as string;

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

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
      <h1 className="mb-8 text-center text-3xl font-bold">Create Account</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-300">Display Name</label>
          <input
            type="text"
            name="displayName"
            required
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white"
          />
        </div>

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
            minLength={8}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white"
          />
          <span className="text-xs text-gray-500">Minimum 8 characters</span>
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
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Already have an account?{" "}
        <a href="/login" className="text-blue-400 hover:underline">
          Log in
        </a>
      </p>
    </div>
  );
}
