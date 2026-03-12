import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/shared-types", "@repo/parameter-parser", "@repo/db"],
};

export default nextConfig;
