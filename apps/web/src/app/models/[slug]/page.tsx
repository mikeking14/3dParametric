import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ModelDetailClient } from "./model-detail-client";

interface ModelPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ModelPage({ params }: ModelPageProps) {
  const { slug } = await params;

  const model = await prisma.model.findUnique({
    where: { slug },
    include: {
      tags: true,
      seller: { select: { displayName: true, avatarUrl: true } },
    },
  });

  if (!model) {
    notFound();
  }

  const manifest = JSON.parse(model.paramManifest);

  return (
    <ModelDetailClient
      model={{
        id: model.id,
        title: model.title,
        description: model.description,
        slug: model.slug,
        sourceType: model.sourceType,
        licenseType: model.licenseType,
        tags: model.tags,
        seller: model.seller,
        paramManifest: manifest,
        createdAt: model.createdAt.toISOString(),
      }}
    />
  );
}
