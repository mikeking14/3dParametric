import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { execFileSync } from "child_process";
import { resolve } from "path";
import { prisma } from "@/lib/prisma";
import type { ParameterValue } from "@repo/shared-types";

const previewDir = resolve(process.cwd(), "../../storage/previews");

function formatScadValue(value: ParameterValue): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return `"${value}"`;
  if (Array.isArray(value)) return `[${value.join(",")}]`;
  return String(value);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { params: modelParams } = (await request.json()) as {
    params: Record<string, ParameterValue>;
  };

  const model = await prisma.model.findUnique({
    where: { slug },
    select: { sourceFile: true, sourceType: true },
  });

  if (!model) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  mkdirSync(previewDir, { recursive: true });
  const outputFile = resolve(previewDir, `${slug}-preview.stl`);

  try {
    if (model.sourceType === "openscad") {
      const args = ["-o", outputFile];
      for (const [name, value] of Object.entries(modelParams || {})) {
        args.push("-D", `${name}=${formatScadValue(value)}`);
      }
      args.push(model.sourceFile);
      execFileSync("openscad", args, { timeout: 30000 });
    } else if (model.sourceType === "cadquery") {
      const source = readFileSync(model.sourceFile, "utf-8");
      const paramOverrides = Object.entries(modelParams || {})
        .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
        .join("\n");

      const wrapper = `
import cadquery as cq
${paramOverrides}
${source.replace(/show_object\(.*\)/, "")}
cq.exporters.export(result, "${outputFile}")
`;
      const wrapperFile = resolve(previewDir, `${slug}-wrapper.py`);
      writeFileSync(wrapperFile, wrapper);
      execFileSync("python3", [wrapperFile], { timeout: 30000 });
    }

    if (!existsSync(outputFile)) {
      return NextResponse.json(
        { error: "Preview generation failed" },
        { status: 500 }
      );
    }

    const stl = readFileSync(outputFile, "utf-8");
    return NextResponse.json({ stl });
  } catch (err: any) {
    const msg = err.message || "Preview failed";
    if (msg.includes("ENOENT")) {
      const tool =
        model.sourceType === "openscad" ? "OpenSCAD" : "Python/CadQuery";
      return NextResponse.json(
        { error: `${tool} CLI not available for server-side preview` },
        { status: 501 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
