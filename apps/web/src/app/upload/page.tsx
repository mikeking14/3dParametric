"use client";

import { useState, type FormEvent } from "react";

export default function UploadPage() {
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("uploading");
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/models/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setResult(data);
      setStatus("success");
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  }

  if (status === "success" && result) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <h1 className="text-3xl font-bold">Upload Successful!</h1>
        <p className="mt-4 text-gray-400">
          Your model &quot;{result.title}&quot; has been uploaded with{" "}
          {result.paramManifest?.parameters?.length || 0} parameters detected.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <a
            href={`/models/${result.slug}`}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium hover:bg-blue-500"
          >
            View Model
          </a>
          <button
            onClick={() => {
              setStatus("idle");
              setResult(null);
            }}
            className="rounded-lg border border-gray-700 px-6 py-3 font-medium hover:border-gray-500"
          >
            Upload Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-8 text-3xl font-bold">Upload a Model</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-300">
            Model File (.scad or .py)
          </label>
          <input
            type="file"
            name="file"
            accept=".scad,.py"
            required
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:text-white"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-300">Title</label>
          <input
            type="text"
            name="title"
            required
            placeholder="My Parametric Model"
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-300">
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="Describe your model..."
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-300">License</label>
          <select
            name="licenseType"
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white"
          >
            <option value="personal_use">Personal Use</option>
            <option value="modify_and_print">Modify & Print</option>
            <option value="full_source">Full Source</option>
            <option value="cc_by">CC BY 4.0</option>
            <option value="cc_by_sa">CC BY-SA 4.0</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-300">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            name="tags"
            placeholder="gear, mechanical, printable"
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-900/50 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={status === "uploading"}
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          {status === "uploading" ? "Uploading..." : "Upload Model"}
        </button>
      </form>
    </div>
  );
}
