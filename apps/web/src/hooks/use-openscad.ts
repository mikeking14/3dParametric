"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ParameterValue } from "@repo/shared-types";

interface UseOpenScadOptions {
  slug: string;
  sourceType: string;
  paramValues: Record<string, ParameterValue>;
}

function formatScadValue(value: ParameterValue): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return `"${value}"`;
  if (Array.isArray(value)) return `[${value.join(",")}]`;
  return String(value);
}

function injectParams(
  source: string,
  params: Record<string, ParameterValue>
): string {
  const overrides = Object.entries(params)
    .map(([name, value]) => `${name} = ${formatScadValue(value)};`)
    .join("\n");
  return overrides + "\n" + source;
}

export function useOpenScad({
  slug,
  sourceType,
  paramValues,
}: UseOpenScadOptions) {
  const [stlData, setStlData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<string | null>(null);
  const instanceRef = useRef<any>(null);
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const initializedRef = useRef(false);

  // For OpenSCAD: fetch source and init WASM
  useEffect(() => {
    if (sourceType !== "openscad") return;

    let cancelled = false;

    async function init() {
      try {
        // Fetch source
        const srcRes = await fetch(`/api/models/${slug}/source`);
        const srcData = await srcRes.json();
        if (cancelled || !srcData.source) return;
        sourceRef.current = srcData.source;

        // Init WASM
        const { createOpenSCAD } = await import("openscad-wasm");
        const instance = await createOpenSCAD({
          noInitialRun: true,
          print: () => {},
          printErr: () => {},
        });

        if (cancelled) return;
        instanceRef.current = instance;
        initializedRef.current = true;
      } catch (err: any) {
        if (!cancelled) {
          setError("Failed to initialize OpenSCAD: " + err.message);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [slug, sourceType]);

  // Render function for OpenSCAD
  const renderOpenScad = useCallback(
    async (params: Record<string, ParameterValue>) => {
      if (!instanceRef.current || !sourceRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const code = injectParams(sourceRef.current, params);
        const stl = await instanceRef.current.renderToStl(code);
        setStlData(stl);
      } catch (err: any) {
        setError("Render failed: " + err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Render function for CadQuery (server-side)
  const renderCadQuery = useCallback(
    async (params: Record<string, ParameterValue>) => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/models/${slug}/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ params }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Server preview failed");
        }

        if (data.stl) {
          setStlData(data.stl);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [slug]
  );

  // Debounced re-render on param change
  useEffect(() => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = setTimeout(() => {
      if (sourceType === "openscad" && initializedRef.current) {
        renderOpenScad(paramValues);
      } else if (sourceType === "cadquery") {
        renderCadQuery(paramValues);
      }
    }, sourceType === "cadquery" ? 800 : 300); // Longer debounce for server-side

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [paramValues, sourceType, renderOpenScad, renderCadQuery]);

  return { stlData, loading, error };
}
