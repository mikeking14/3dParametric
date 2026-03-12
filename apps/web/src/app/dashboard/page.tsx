import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await requireAuth();

  const [models, totalDownloads] = await Promise.all([
    prisma.model.findMany({
      where: { sellerId: session.userId },
      include: {
        tags: true,
        _count: { select: { downloads: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.download.count({
      where: { model: { sellerId: session.userId } },
    }),
  ]);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-gray-400">
            Welcome back, {session.displayName}
          </p>
        </div>
        <a
          href="/upload"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
        >
          Upload Model
        </a>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <p className="text-sm text-gray-400">Total Models</p>
          <p className="mt-1 text-3xl font-bold">{models.length}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <p className="text-sm text-gray-400">Total Downloads</p>
          <p className="mt-1 text-3xl font-bold">{totalDownloads}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <p className="text-sm text-gray-400">Published</p>
          <p className="mt-1 text-3xl font-bold">
            {models.filter((m) => m.published).length}
          </p>
        </div>
      </div>

      <h2 className="mb-4 text-xl font-semibold">Your Models</h2>

      {models.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 py-12 text-center">
          <p className="text-gray-400">You haven&apos;t uploaded any models yet.</p>
          <a
            href="/upload"
            className="mt-4 inline-block text-blue-400 hover:underline"
          >
            Upload your first model
          </a>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-400">Title</th>
                <th className="px-4 py-3 font-medium text-gray-400">Type</th>
                <th className="px-4 py-3 font-medium text-gray-400">
                  Downloads
                </th>
                <th className="px-4 py-3 font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-400">
                  Created
                </th>
                <th className="px-4 py-3 font-medium text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {models.map((model) => (
                <tr key={model.id} className="hover:bg-gray-900/50">
                  <td className="px-4 py-3">
                    <a
                      href={`/models/${model.slug}`}
                      className="text-blue-400 hover:underline"
                    >
                      {model.title}
                    </a>
                    <div className="mt-1 flex gap-1">
                      {model.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-500"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {model.sourceType === "openscad" ? "OpenSCAD" : "CadQuery"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {model._count.downloads}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        model.published
                          ? "bg-green-900/50 text-green-400"
                          : "bg-yellow-900/50 text-yellow-400"
                      }`}
                    >
                      {model.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(model.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/models/${model.slug}/edit`}
                      className="text-sm text-gray-400 hover:text-white"
                    >
                      Edit
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
