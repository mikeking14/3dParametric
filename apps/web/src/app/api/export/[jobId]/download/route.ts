import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const job = await prisma.exportJob.findUnique({ where: { id: jobId } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "FAILED") {
    return NextResponse.json(
      { error: job.error || "Export failed" },
      { status: 500 }
    );
  }

  if (job.status !== "COMPLETED" || !job.resultPath) {
    return NextResponse.json(
      { error: "Export not ready" },
      { status: 202 }
    );
  }

  if (!existsSync(job.resultPath)) {
    return NextResponse.json(
      { error: "Export file not found" },
      { status: 404 }
    );
  }

  // Record download
  const session = await getSession();
  const model = await prisma.model.findUnique({
    where: { id: job.modelId },
    select: { slug: true },
  });

  if (session.userId) {
    await prisma.download.create({
      data: {
        userId: session.userId,
        modelId: job.modelId,
        format: job.format,
        params: job.params,
      },
    });
  }

  const fileBuffer = readFileSync(job.resultPath);
  const filename = `${model?.slug || "model"}.${job.format}`;

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
