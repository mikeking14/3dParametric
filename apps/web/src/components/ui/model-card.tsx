"use client";

interface ModelCardProps {
  title: string;
  description: string;
  slug: string;
  sourceType: string;
  tags: { id: string; name: string }[];
  seller: { displayName: string };
}

export function ModelCard({
  title,
  description,
  slug,
  sourceType,
  tags,
  seller,
}: ModelCardProps) {
  return (
    <a
      href={`/models/${slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition-colors hover:border-gray-600"
    >
      <div className="flex h-48 items-center justify-center bg-gray-800">
        <div className="text-4xl text-gray-600">
          {sourceType === "openscad" ? "📐" : "🔧"}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-white group-hover:text-blue-400">
          {title}
        </h3>
        <p className="line-clamp-2 text-sm text-gray-400">{description}</p>
        <div className="mt-auto flex flex-wrap gap-1 pt-2">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
            >
              {tag.name}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-500">by {seller.displayName}</p>
      </div>
    </a>
  );
}
