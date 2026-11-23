import type { NextConfig } from "next";

// Safety guard: the mock API is a development tool. A production build or
// server must never silently serve demo data instead of the real backend.
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_USE_MOCK_API === "true"
) {
  throw new Error(
    "NEXT_PUBLIC_USE_MOCK_API=true is not allowed in production. " +
      "Unset it (or set it to false) before running `next build` / `next start`.",
  );
}

const nextConfig: NextConfig = {
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
