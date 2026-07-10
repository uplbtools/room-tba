import { UPLB_OSA_ORGANIZATIONS_URL } from "@constants/community-links";

export type OsaOrganization = {
  name: string;
  officialUrl: string;
};

function textContent(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|nbsp|quot|#39|#x27);/gi, (_, entity: string) => {
      switch (entity.toLowerCase()) {
        case "amp":
          return "&";
        case "quot":
          return '"';
        case "#39":
        case "#x27":
          return "'";
        default:
          return " ";
      }
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract the public organization profile links from OSA's rendered directory. */
export function parseOsaOrganizations(html: string): OsaOrganization[] {
  const organizations = new Map<string, OsaOrganization>();
  const anchors = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchors)) {
    const attributes = match[1];
    const className =
      attributes.match(/\bclass\s*=\s*(["'])(.*?)\1/i)?.[2] ?? "";
    const href = attributes.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (!className.split(/\s+/).includes("orgText") || !href) continue;

    const officialUrl = new URL(href, UPLB_OSA_ORGANIZATIONS_URL);
    if (
      officialUrl.origin !== "https://uplbosa.org" ||
      !officialUrl.pathname.startsWith("/orgs/")
    ) {
      continue;
    }

    const name = textContent(match[2]);
    if (name && !organizations.has(officialUrl.toString())) {
      organizations.set(officialUrl.toString(), {
        name,
        officialUrl: officialUrl.toString(),
      });
    }
  }

  return [...organizations.values()];
}
