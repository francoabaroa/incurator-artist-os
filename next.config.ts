import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["shiki", "@json-render/core", "@json-render/react"],
};

export default nextConfig;
