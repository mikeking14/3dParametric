"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";

export default function EditModelPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [model, setModel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/models/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Model not found");
        return res.json();
      })
      .then(setModel)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/models/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description"),
          licenseType: formData.get("licenseType"),
          published: formData.get("published") === "on",
          tags: (formData.get("tags") as string)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Update failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/models/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-500">Loading model...</div>
    );
  }

  if (!model) {
    return (
      <div className="py-20 text-center text-gray-500">Model not found</div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-8 text-3xl font-bold">Edit Model</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-300">Title</label>
          <input
            type="text"
            name="title"
            defaultValue={model.title}
            required
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-300">
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={model.description}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-300">License</label>
          <select
            name="licenseType"
            defaultValue={model.licenseType}
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
            defaultValue={model.tags?.map((t: any) => t.name).join(", ")}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white"
          />
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="published"
            defaultChecked={model.published}
            className="h-4 w-4 rounded border-gray-600 bg-gray-800"
          />
          <span className="text-sm text-gray-300">Published</span>
        </label>

        {error && (
          <div className="rounded-lg bg-red-900/50 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-700 px-4 py-3 font-medium hover:border-gray-500"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-12 border-t border-gray-800 pt-8">
        <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="mt-4 rounded-lg border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-900/30"
          >
            Delete Model
          </button>
        ) : (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-gray-400">Are you sure?</span>
            <button
              onClick={handleDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-500"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:border-gray-500"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
