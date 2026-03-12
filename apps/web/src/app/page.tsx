export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <h1 className="text-5xl font-bold">Parametric Marketplace</h1>
      <p className="max-w-lg text-center text-lg text-gray-400">
        Buy, customize, and download parametric 3D models. Adjust parameters in
        real-time and export print-ready files.
      </p>
      <div className="flex gap-4 pt-4">
        <a
          href="/browse"
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium hover:bg-blue-500"
        >
          Browse Models
        </a>
        <a
          href="/upload"
          className="rounded-lg border border-gray-700 px-6 py-3 font-medium hover:border-gray-500"
        >
          Upload a Model
        </a>
      </div>
    </div>
  );
}
