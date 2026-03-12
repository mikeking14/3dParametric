import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { parseOpenScad, parseCadQuery } from "@repo/parameter-parser";

const storageDir = resolve(process.cwd(), "../../storage/models");

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const licenseType = (formData.get("licenseType") as string) || "personal_use";
    const tagsRaw = formData.get("tags") as string | null;

    if (!file || !title) {
      return NextResponse.json(
        { error: "file and title are required" },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase();

    if (!ext || !["scad", "py"].includes(ext)) {
      return NextResponse.json(
        { error: "Only .scad and .py files are supported" },
        { status: 400 }
      );
    }

    const sourceType = ext === "scad" ? "openscad" : "cadquery";
    const source = await file.text();

    // Parse parameters
    const manifest =
      sourceType === "openscad"
        ? parseOpenScad(source)
        : parseCadQuery(source);

    // Save file to storage
    mkdirSync(storageDir, { recursive: true });
    const storedName = `${Date.now()}-${fileName}`;
    const storedPath = resolve(storageDir, storedName);
    writeFileSync(storedPath, source, "utf-8");

    // Generate slug
    let slug = slugify(title);
    const existing = await prisma.model.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    // Handle tags
    const tagNames = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const tagRecords = await Promise.all(
      tagNames.map((name: string) =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    );

    // Get seller from session, fall back to first seller for unauthenticated uploads
    const session = await getSession();
    let sellerId = session.userId;
    if (!sellerId) {
      const fallback = await prisma.user.findFirst({ where: { role: "SELLER" } });
      if (!fallback) {
        return NextResponse.json(
          { error: "Please log in to upload models" },
          { status: 401 }
        );
      }
      sellerId = fallback.id;
    }

    const model = await prisma.model.create({
      data: {
        title,
        description: description || "",
        slug,
        sourceType,
        sourceFile: storedPath,
        paramManifest: JSON.stringify(manifest),
        licenseType,
        published: true,
        sellerId,
        tags: { connect: tagRecords.map((t) => ({ id: t.id })) },
      },
      include: { tags: true },
    });

    return NextResponse.json(
      { ...model, paramManifest: manifest },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload model" },
      { status: 500 }
    );
  }
}
