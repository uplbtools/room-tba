// src/lib/site.ts

export const SITE_URL = "https://room-tba.stimmie.dev";
export const SITE_NAME = "Room TBA";
export const DEFAULT_TITLE =
  "Room TBA | Find Rooms, Buildings, Colleges, and Divisions at UPLB";
export const DEFAULT_DESCRIPTION =
  "Room TBA helps UPLB students find rooms, buildings, colleges, and divisions across the Los Banos campus.";

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function slugifySegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function jsonLd(...items: Array<Record<string, unknown> | null>) {
  return items.filter(Boolean);
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "en",
  };
}

export function webpageSchema({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: absoluteUrl(path),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
