import { NextRequest, NextResponse } from "next/server";
import { unlinkSync, existsSync } from "fs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const model = await prisma.model.findUnique({
    where: { slug },
    include: {
      tags: true,
      seller: { select: { displayName: true, avatarUrl: true } },
    },
  });

  if (!model) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...model,
    paramManifest: JSON.parse(model.paramManifest),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await getSession();

  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const model = await prisma.model.findUnique({ where: { slug } });
  if (!model) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  if (model.sellerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, licenseType, published, tags } = body;

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (licenseType !== undefined) updateData.licenseType = licenseType;
  if (published !== undefined) updateData.published = published;

  if (tags !== undefined) {
    const tagNames = tags as string[];
    const tagRecords = await Promise.all(
      tagNames.map((name: string) =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    );
    updateData.tags = { set: tagRecords.map((t) => ({ id: t.id })) };
  }

  const updated = await prisma.model.update({
    where: { slug },
    data: updateData,
    include: { tags: true },
  });

  return NextResponse.json({
    ...updated,
    paramManifest: JSON.parse(updated.paramManifest),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await getSession();

  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const model = await prisma.model.findUnique({ where: { slug } });
  if (!model) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  if (model.sellerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete related records first
  await prisma.download.deleteMany({ where: { modelId: model.id } });
  await prisma.exportJob.deleteMany({ where: { modelId: model.id } });
  await prisma.model.delete({ where: { slug } });

  // Clean up source file
  if (existsSync(model.sourceFile)) {
    try {
      unlinkSync(model.sourceFile);
    } catch {
      // non-critical
    }
  }

  return NextResponse.json({ ok: true });
}
