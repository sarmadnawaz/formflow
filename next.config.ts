import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads the session or the database, so pages render per request.
  output: "standalone",
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
