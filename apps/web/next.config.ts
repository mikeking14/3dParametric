import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@repo/shared-types", "@repo/parameter-parser", "@repo/db"],
};

export default nextConfig;
