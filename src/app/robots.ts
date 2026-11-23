import type { MetadataRoute } from "next";

/** Public content is crawlable; account, auth and the API are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/login", "/register", "/forgot-password", "/reset-password", "/search", "/api/"],
    },
  };
}
