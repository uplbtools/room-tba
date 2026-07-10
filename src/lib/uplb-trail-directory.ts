export type TrailWebsite = {
  name: string;
  url: string;
  description: string;
  category: string;
};

export type TrailDirectoryEntry = {
  name: string;
  description: string;
  category: "academic" | "office" | "service" | "unit";
  url: string;
  linkType: "facebook" | "website";
};

const EXCLUDED_CATEGORIES = new Set(["Colleges & Schools", "Main Portals"]);

function titleFromSource(source: TrailWebsite) {
  const description = source.description.trim();
  const title = description
    .replace(/^The official (?:page|website) of\s+/i, "")
    .replace(/\s+(?:Facebook Page|Website)\.?$/i, "")
    .replace(/\.$/, "");
  if (
    /^(?:A research|Access to|Academic Management|Centralized|Focused on|Manages|Provides)/i.test(
      title,
    ) ||
    /\sis\s/i.test(title)
  ) {
    return source.name;
  }
  return title.split(".")[0].trim() || source.name;
}

function shortName(source: TrailWebsite) {
  return source.name.replace(/\s+(?:FB Page|OCS Website|Website)$/i, "").trim();
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function directoryName(source: TrailWebsite) {
  const title = titleFromSource(source);
  const short = shortName(source);
  return normalized(title).includes(normalized(short))
    ? title
    : `${title} (${short})`;
}

function directoryCategory(
  source: TrailWebsite,
  name: string,
): TrailDirectoryEntry["category"] {
  if (source.category === "Major Offices & Services") return "service";
  if (/^Units Under (?:OC|OV)/.test(source.category)) return "office";
  if (
    /^(Department|Institute|College|School|General Education|National Service)/i.test(
      name,
    )
  ) {
    return "academic";
  }
  if (
    /Library|Health|Housing|Security|Guidance|Scholar|Student Learning|Teaching/i.test(
      name,
    )
  ) {
    return "service";
  }
  return "unit";
}

function isFacebook(url: string) {
  const host = new URL(url).hostname;
  return host === "facebook.com" || host.endsWith(".facebook.com");
}

/**
 * Converts TRAIL's public websites directory to map-searchable UPLB units.
 * Colleges and broad portals remain in their existing dedicated app surfaces.
 */
export function trailDirectoryEntries(
  sources: TrailWebsite[],
): TrailDirectoryEntry[] {
  const groups = new Map<string, TrailWebsite[]>();
  for (const source of sources) {
    if (EXCLUDED_CATEGORIES.has(source.category)) continue;
    const key = normalized(titleFromSource(source));
    groups.set(key, [...(groups.get(key) ?? []), source]);
  }

  return [...groups.values()].map((sources) => {
    const source = [...sources].sort(
      (a, b) => Number(isFacebook(a.url)) - Number(isFacebook(b.url)),
    )[0];
    const name = directoryName(source);
    return {
      name,
      description: source.description.trim(),
      category: directoryCategory(source, name),
      url: source.url,
      linkType: isFacebook(source.url) ? "facebook" : "website",
    };
  });
}
