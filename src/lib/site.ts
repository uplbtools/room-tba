import { campusSite } from "../campus.config";

export const SITE_URL = campusSite.url;
export const SITE_NAME = campusSite.name;
export const DEFAULT_TITLE = campusSite.title;
export const DEFAULT_DESCRIPTION = campusSite.description;
export const DEFAULT_OG_IMAGE = "/og.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

/** Absolute URL for an Open Graph / structured-data image (defaults to the
 * site social card). Accepts a relative path or an already-absolute URL. */
export function ogImageUrl(path: string = DEFAULT_OG_IMAGE) {
  return absoluteUrl(path);
}

/** Path to the dynamic OG card (/og.png) for this exact URL — a rendered card
 * with the entity's own title/subtitle instead of the generic social image.
 * kicker is the short type label (Room, Building, Planner, …). */
export function ogCardPath(opts: {
  title: string;
  subtitle?: string | null;
  kicker?: string | null;
}): string {
  const params = new URLSearchParams({ t: opts.title });
  if (opts.subtitle) params.set("s", opts.subtitle);
  if (opts.kicker) params.set("k", opts.kicker);
  return `/og.png?${params.toString()}`;
}

/** Normalize a search term / alias for matching: NFKD, lowercase, and strip
 * everything that is not a letter or digit (so "PhySci", "CAS A1", and "CASA1"
 * collapse to comparable keys). Used for the alias synonym map (#155). */
export function normalizeAlias(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
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
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: absoluteUrl(path),
    image: ogImageUrl(image),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
