"use client";

import { useState, useCallback } from "react";
import type { ParameterDefinition, ParameterValue } from "@repo/shared-types";

interface ParameterFormProps {
  parameters: ParameterDefinition[];
  onChange: (values: Record<string, ParameterValue>) => void;
}

export function ParameterForm({ parameters, onChange }: ParameterFormProps) {
  const [values, setValues] = useState<Record<string, ParameterValue>>(() => {
    const initial: Record<string, ParameterValue> = {};
    for (const p of parameters) {
      initial[p.name] = p.default;
    }
    return initial;
  });

  const handleChange = useCallback(
    (name: string, value: ParameterValue) => {
      setValues((prev) => {
        const next = { ...prev, [name]: value };
        onChange(next);
        return next;
      });
    },
    [onChange]
  );

  // Group parameters
  const grouped = new Map<string, ParameterDefinition[]>();
  const ungrouped: ParameterDefinition[] = [];
  for (const p of parameters) {
    if (p.group) {
      const list = grouped.get(p.group) || [];
      list.push(p);
      grouped.set(p.group, list);
    } else {
      ungrouped.push(p);
    }
  }

  const renderInput = (param: ParameterDefinition) => {
    const value = values[param.name];
    const key = param.name;

    switch (param.type) {
      case "boolean":
        return (
          <label key={key} className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={(e) => handleChange(param.name, e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-800"
            />
            <span className="text-sm text-gray-300">{param.label}</span>
          </label>
        );

      case "enum":
        return (
          <div key={key} className="flex flex-col gap-1 py-2">
            <label className="text-sm text-gray-400">{param.label}</label>
            <select
              value={String(value)}
              onChange={(e) => {
                const opt = param.constraints?.options?.find(
                  (o) => String(o.value) === e.target.value
                );
                handleChange(param.name, opt ? opt.value : e.target.value);
              }}
              className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white"
            >
              {param.constraints?.options?.map((opt) => (
                <option key={String(opt.value)} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case "string":
        return (
          <div key={key} className="flex flex-col gap-1 py-2">
            <label className="text-sm text-gray-400">{param.label}</label>
            <input
              type="text"
              value={value as string}
              onChange={(e) => handleChange(param.name, e.target.value)}
              maxLength={param.constraints?.maxLength}
              className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white"
            />
          </div>
        );

      case "vector":
        return (
          <div key={key} className="flex flex-col gap-1 py-2">
            <label className="text-sm text-gray-400">{param.label}</label>
            <div className="flex gap-2">
              {(value as number[]).map((v, idx) => (
                <input
                  key={idx}
                  type="number"
                  value={v}
                  onChange={(e) => {
                    const arr = [...(value as number[])];
                    arr[idx] = parseFloat(e.target.value) || 0;
                    handleChange(param.name, arr);
                  }}
                  className="w-20 rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-white"
                />
              ))}
            </div>
          </div>
        );

      case "number":
      case "integer":
      default:
        return (
          <div key={key} className="flex flex-col gap-1 py-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400">{param.label}</label>
              <span className="text-sm text-gray-500">{String(value)}</span>
            </div>
            {param.constraints?.min !== undefined &&
            param.constraints?.max !== undefined ? (
              <input
                type="range"
                min={param.constraints.min}
                max={param.constraints.max}
                step={param.constraints.step || (param.type === "integer" ? 1 : 0.1)}
                value={value as number}
                onChange={(e) =>
                  handleChange(param.name, parseFloat(e.target.value))
                }
                className="w-full"
              />
            ) : (
              <input
                type="number"
                value={value as number}
                step={param.constraints?.step || (param.type === "integer" ? 1 : 0.1)}
                min={param.constraints?.min}
                max={param.constraints?.max}
                onChange={(e) =>
                  handleChange(param.name, parseFloat(e.target.value) || 0)
                }
                className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white"
              />
            )}
          </div>
        );
    }
  };

  const renderGroup = (name: string, params: ParameterDefinition[]) => (
    <div key={name} className="border-b border-gray-800 pb-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        {name}
      </h3>
      {params.map(renderInput)}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {ungrouped.length > 0 && (
        <div className="border-b border-gray-800 pb-4">
          {ungrouped.map(renderInput)}
        </div>
      )}
      {Array.from(grouped.entries()).map(([name, params]) =>
        renderGroup(name, params)
      )}
    </div>
  );
}
