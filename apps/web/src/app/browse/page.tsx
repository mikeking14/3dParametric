import { prisma } from "@/lib/prisma";
import { ModelCard } from "@/components/ui/model-card";

interface BrowsePageProps {
  searchParams: Promise<{ search?: string; tag?: string; page?: string }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const { search, tag, page: pageStr } = await searchParams;
  const page = parseInt(pageStr || "1", 10);
  const limit = 12;

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

  const [models, total, allTags] = await Promise.all([
    prisma.model.findMany({
      where,
      include: { tags: true, seller: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.model.count({ where }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Browse Models</h1>
        <form action="/browse" method="GET" className="flex gap-2">
          <input
            type="text"
            name="search"
            placeholder="Search models..."
            defaultValue={search}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white placeholder-gray-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            Search
          </button>
        </form>
      </div>

      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <a
            href="/browse"
            className={`rounded-full px-3 py-1 text-sm ${
              !tag
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            All
          </a>
          {allTags.map((t: { id: string; name: string }) => (
            <a
              key={t.id}
              href={`/browse?tag=${encodeURIComponent(t.name)}`}
              className={`rounded-full px-3 py-1 text-sm ${
                tag === t.name
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {t.name}
            </a>
          ))}
        </div>
      )}

      {models.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          <p className="text-lg">No models found</p>
          {search && (
            <p className="mt-2">
              Try a different search term or{" "}
              <a href="/browse" className="text-blue-400 hover:underline">
                browse all
              </a>
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model: any) => (
            <ModelCard
              key={model.id}
              title={model.title}
              description={model.description}
              slug={model.slug}
              sourceType={model.sourceType}
              tags={model.tags}
              seller={model.seller}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/browse?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`}
              className={`rounded px-3 py-1 text-sm ${
                p === page
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
