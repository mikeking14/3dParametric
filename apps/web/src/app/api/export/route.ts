import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runExport } from "@/lib/export";

export async function POST(request: NextRequest) {
  try {
    const { modelId, params, format } = await request.json();

    if (!modelId || !format) {
      return NextResponse.json(
        { error: "modelId and format are required" },
        { status: 400 }
      );
    }

    if (!["stl", "step"].includes(format)) {
      return NextResponse.json(
        { error: "Supported formats: stl, step" },
        { status: 400 }
      );
    }

    const model = await prisma.model.findUnique({ where: { id: modelId } });
    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const job = await runExport(modelId, params || {}, format);

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      error: job.status === "FAILED" ? job.error : undefined,
      downloadUrl:
        job.status === "COMPLETED"
          ? `/api/export/${job.id}/download`
          : undefined,
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
