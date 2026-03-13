"use client";

interface ModelCardProps {
  title: string;
  description: string;
  slug: string;
  sourceType: string;
  tags: { id: string; name: string }[];
  seller: { displayName: string };
}

function PlaceholderPreview({ title, sourceType }: { title: string; sourceType: string }) {
  // Generate a deterministic color from the title
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;

  return (
    <div
      className="relative flex h-48 items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 40%, 15%) 0%, hsl(${(hue + 40) % 360}, 50%, 10%) 100%)`,
      }}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      {/* 3D shape wireframe */}
      <svg
        viewBox="0 0 120 120"
        className="relative h-28 w-28 drop-shadow-lg"
        style={{ color: `hsl(${hue}, 60%, 60%)` }}
      >
        {sourceType === "openscad" ? (
          // Cube wireframe
          <g stroke="currentColor" fill="none" strokeWidth="1.5" opacity="0.8">
            <polygon points="30,80 60,95 90,80 60,65" />
            <polygon points="30,80 30,50 60,35 60,65" />
            <polygon points="60,65 60,35 90,50 90,80" />
            <line x1="30" y1="50" x2="60" y2="65" strokeDasharray="3,3" opacity="0.3" />
            <line x1="60" y1="65" x2="60" y2="95" strokeDasharray="3,3" opacity="0.3" />
            <line x1="60" y1="65" x2="90" y2="50" strokeDasharray="3,3" opacity="0.3" />
            <polygon points="30,50 60,35 90,50 60,65" fill="currentColor" fillOpacity="0.1" />
          </g>
        ) : (
          // Cylinder/gear wireframe
          <g stroke="currentColor" fill="none" strokeWidth="1.5" opacity="0.8">
            <ellipse cx="60" cy="35" rx="30" ry="12" />
            <ellipse cx="60" cy="85" rx="30" ry="12" />
            <line x1="30" y1="35" x2="30" y2="85" />
            <line x1="90" y1="35" x2="90" y2="85" />
            <ellipse cx="60" cy="85" rx="30" ry="12" fill="currentColor" fillOpacity="0.1" />
          </g>
        )}
      </svg>
      {/* Type badge */}
      <div className="absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-300 backdrop-blur-sm">
        {sourceType === "openscad" ? "OpenSCAD" : "CadQuery"}
      </div>
    </div>
  );
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
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition-all hover:border-gray-600 hover:shadow-lg hover:shadow-black/20"
    >
      <PlaceholderPreview title={title} sourceType={sourceType} />
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
