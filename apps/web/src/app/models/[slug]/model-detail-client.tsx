"use client";

import { useState, useCallback } from "react";
import type { ParameterManifest, ParameterValue } from "@repo/shared-types";
import { ParameterForm } from "@/components/params/parameter-form";
import { useOpenScad } from "@/hooks/use-openscad";
import dynamic from "next/dynamic";

const ModelViewer = dynamic(
  () =>
    import("@/components/viewer/model-viewer").then((mod) => mod.ModelViewer),
  { ssr: false, loading: () => <ViewerPlaceholder /> }
);

function ViewerPlaceholder() {
  return (
    <div className="flex h-[500px] items-center justify-center rounded-xl bg-gray-900">
      <span className="text-gray-500">Loading 3D viewer...</span>
    </div>
  );
}

interface ModelData {
  id: string;
  title: string;
  description: string;
  slug: string;
  sourceType: string;
  licenseType: string;
  tags: { id: string; name: string }[];
  seller: { displayName: string; avatarUrl: string | null };
  paramManifest: ParameterManifest;
  createdAt: string;
}

interface ModelDetailClientProps {
  model: ModelData;
}

const LICENSE_LABELS: Record<string, string> = {
  personal_use: "Personal Use",
  modify_and_print: "Modify & Print",
  full_source: "Full Source",
  cc_by: "CC BY 4.0",
  cc_by_sa: "CC BY-SA 4.0",
};

export function ModelDetailClient({ model }: ModelDetailClientProps) {
  const [paramValues, setParamValues] = useState<
    Record<string, ParameterValue>
  >(() => {
    const initial: Record<string, ParameterValue> = {};
    for (const p of model.paramManifest.parameters) {
      initial[p.name] = p.default;
    }
    return initial;
  });

  const [exportStatus, setExportStatus] = useState<
    "idle" | "exporting" | "error"
  >("idle");
  const [exportError, setExportError] = useState("");

  // OpenSCAD WASM live rendering
  const {
    stlData,
    loading: renderLoading,
    error: renderError,
  } = useOpenScad({
    slug: model.slug,
    sourceType: model.sourceType,
    paramValues,
  });

  const handleParamChange = useCallback(
    (values: Record<string, ParameterValue>) => {
      setParamValues(values);
    },
    []
  );

  const handleDownload = useCallback(
    async (format: string) => {
      setExportStatus("exporting");
      setExportError("");

      try {
        const res = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelId: model.id,
            params: paramValues,
            format,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.status === "FAILED") {
          throw new Error(data.error || "Export failed");
        }

        if (data.downloadUrl) {
          window.location.href = data.downloadUrl;
        }

        setExportStatus("idle");
      } catch (err: any) {
        setExportError(err.message);
        setExportStatus("error");
      }
    },
    [model.id, paramValues]
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Left: 3D Viewer */}
      <div className="lg:col-span-2">
        <ModelViewer
          stlData={stlData}
          loading={renderLoading}
          error={renderError}
        />

        <div className="mt-6">
          <h1 className="text-3xl font-bold">{model.title}</h1>
          <p className="mt-2 text-gray-400">{model.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-400">
              {model.sourceType === "openscad" ? "OpenSCAD" : "CadQuery"}
            </span>
            <span className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-400">
              {LICENSE_LABELS[model.licenseType] || model.licenseType}
            </span>
            {model.tags.map((tag) => (
              <a
                key={tag.id}
                href={`/browse?tag=${encodeURIComponent(tag.name)}`}
                className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-400 hover:text-white"
              >
                {tag.name}
              </a>
            ))}
          </div>

          <p className="mt-3 text-sm text-gray-500">
            by {model.seller.displayName} &middot;{" "}
            {new Date(model.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Right: Parameter Panel */}
      <div className="lg:col-span-1">
        <div className="sticky top-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Customize Parameters</h2>

          {model.paramManifest.parameters.length > 0 ? (
            <ParameterForm
              parameters={model.paramManifest.parameters}
              onChange={handleParamChange}
            />
          ) : (
            <p className="text-sm text-gray-500">
              No customizable parameters for this model.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => handleDownload("stl")}
              disabled={exportStatus === "exporting"}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              {exportStatus === "exporting" ? "Generating..." : "Download STL"}
            </button>
            <button
              onClick={() => handleDownload("step")}
              disabled={exportStatus === "exporting"}
              className="w-full rounded-lg border border-gray-700 px-4 py-3 font-medium hover:border-gray-500 disabled:opacity-50"
            >
              Download STEP
            </button>
          </div>

          {exportError && (
            <div className="mt-3 rounded-lg bg-red-900/50 px-3 py-2 text-sm text-red-300">
              {exportError}
            </div>
          )}

          <div className="mt-4 rounded-lg bg-gray-800 p-3">
            <h3 className="text-xs font-semibold uppercase text-gray-500">
              Current Values
            </h3>
            <pre className="mt-2 max-h-40 overflow-auto text-xs text-gray-400">
              {JSON.stringify(paramValues, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
