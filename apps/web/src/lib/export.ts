import { execFileSync } from "child_process";
import { mkdirSync, existsSync } from "fs";
import { resolve } from "path";
import { prisma } from "./prisma";
import type { ParameterValue } from "@repo/shared-types";

const exportDir = resolve(process.cwd(), "../../storage/exports");

function formatScadValue(value: ParameterValue): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return `"${value}"`;
  if (Array.isArray(value)) return `[${value.join(",")}]`;
  return String(value);
}

function formatPythonValue(value: ParameterValue): string {
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return `"${value}"`;
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return String(value);
}

export function buildOpenScadArgs(
  sourceFile: string,
  params: Record<string, ParameterValue>,
  outputPath: string
): string[] {
  const args = ["-o", outputPath];
  for (const [name, value] of Object.entries(params)) {
    args.push("-D", `${name}=${formatScadValue(value)}`);
  }
  args.push(sourceFile);
  return args;
}

export async function runExport(
  modelId: string,
  params: Record<string, ParameterValue>,
  format: string
) {
  const model = await prisma.model.findUnique({ where: { id: modelId } });
  if (!model) throw new Error("Model not found");

  mkdirSync(exportDir, { recursive: true });

  const job = await prisma.exportJob.create({
    data: {
      modelId,
      format,
      params: JSON.stringify(params),
      status: "PENDING",
    },
  });

  const outputPath = resolve(exportDir, `${job.id}.${format}`);

  try {
    if (model.sourceType === "openscad") {
      const args = buildOpenScadArgs(model.sourceFile, params, outputPath);
      execFileSync("openscad", args, { timeout: 60000 });
    } else if (model.sourceType === "cadquery") {
      // Build a wrapper script that injects params and exports
      const paramOverrides = Object.entries(params)
        .map(([k, v]) => `${k} = ${formatPythonValue(v)}`)
        .join("\n");

      const wrapper = `
import sys
sys.path.insert(0, '.')
${paramOverrides}
exec(open("${model.sourceFile}").read())
import cadquery as cq
cq.exporters.export(result, "${outputPath}")
`;
      execFileSync("python3", ["-c", wrapper], { timeout: 60000 });
    } else {
      throw new Error(`Unsupported source type: ${model.sourceType}`);
    }

    await prisma.exportJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", resultPath: outputPath },
    });

    return { ...job, status: "COMPLETED", resultPath: outputPath };
  } catch (error: any) {
    const errMsg = error.message || "Export failed";

    await prisma.exportJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: errMsg },
    });

    // If the tool isn't installed, provide a helpful message
    if (errMsg.includes("ENOENT")) {
      const tool = model.sourceType === "openscad" ? "OpenSCAD" : "Python/CadQuery";
      return {
        ...job,
        status: "FAILED",
        error: `${tool} is not installed on this server. Export requires ${tool} CLI.`,
      };
    }

    return { ...job, status: "FAILED", error: errMsg };
  }
}
