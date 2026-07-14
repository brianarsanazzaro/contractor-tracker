import type { MetadataRoute } from "next";

// This site is private. Nothing here should ever appear in a search index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
