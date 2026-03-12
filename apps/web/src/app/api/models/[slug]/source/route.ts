import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const model = await prisma.model.findUnique({
    where: { slug },
    select: { sourceFile: true, sourceType: true },
  });

  if (!model) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  try {
    const source = readFileSync(model.sourceFile, "utf-8");
    return NextResponse.json({ source, sourceType: model.sourceType });
  } catch {
    return NextResponse.json(
      { error: "Source file not found" },
      { status: 404 }
    );
  }
}
