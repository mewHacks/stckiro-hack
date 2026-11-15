import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "node:path";

// Shared env file lives in the repo root (frontend + backend both use it)
loadEnvConfig(path.resolve(process.cwd(), ".."));

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
