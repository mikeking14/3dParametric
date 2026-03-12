import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "12", 10);
  const search = searchParams.get("search") || "";
  const tag = searchParams.get("tag") || "";

  const where: any = { published: true };

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (tag) {
    where.tags = { some: { name: tag } };
  }

  const [models, total] = await Promise.all([
    prisma.model.findMany({
      where,
      include: { tags: true, seller: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.model.count({ where }),
  ]);

  return NextResponse.json({
    models,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
