// Build-time only: post-processes a rendered wiki article so every page gets
// the same permalinks, contents list, and keyboard-reachable tables without
// shipping a script. Pure string work so it is unit-testable.

export type WikiTocEntry = { id: string; text: string };

export type EnhancedWikiHtml = {
  html: string;
  toc: WikiTocEntry[];
  /** Words of visible text, for the reading-time estimate. */
  words: number;
};

const WORDS_PER_MINUTE = 220;
/** Fewer sections than this and a contents list is just noise. */
export const MIN_TOC_ENTRIES = 3;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * Adds ids and permalink anchors to h2/h3, makes `.table-wrap` scroll regions
 * focusable and named, and collects the h2s for a contents list. Ids already
 * in the markup are kept so published deep links keep working.
 */
export function enhanceWikiHtml(html: string): EnhancedWikiHtml {
  const used = new Set<string>();
  for (const match of html.matchAll(/\sid="([^"]+)"/g)) used.add(match[1]!);

  const toc: WikiTocEntry[] = [];
  let lastHeading = "";

  const out = html.replace(
    /<(h[23])((?:\s[^>]*)?)>([\s\S]*?)<\/\1>|<div class="table-wrap"((?:\s[^>]*)?)>/g,
    (
      whole: string,
      tag: string | undefined,
      attrs: string | undefined,
      inner: string | undefined,
      wrapAttrs: string | undefined,
    ) => {
      if (!tag) {
        const label = lastHeading ? `Table: ${lastHeading}` : "Table";
        return `<div class="table-wrap"${wrapAttrs ?? ""} role="region" tabindex="0" aria-label="${escapeHtml(label)}">`;
      }
      const text = stripTags(inner ?? "");
      const idMatch = /\sid="([^"]+)"/.exec(attrs ?? "");
      let id = idMatch?.[1] ?? "";
      let nextAttrs = attrs ?? "";
      if (!id) {
        const base = slugify(text);
        if (!base) return whole;
        id = base;
        for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`;
        used.add(id);
        nextAttrs = `${nextAttrs} id="${id}"`;
      }
      lastHeading = text;
      if (tag === "h2") toc.push({ id, text });
      const anchor = `<a class="heading-anchor" href="#${id}" aria-label="Permalink to ${escapeHtml(text)}">#</a>`;
      return `<${tag}${nextAttrs}>${inner}${anchor}</${tag}>`;
    },
  );

  return {
    html: out,
    toc,
    words: stripTags(html).split(" ").filter(Boolean).length,
  };
}

/** The contents list markup, or "" when the page is too short for one. */
export function wikiTocHtml(toc: readonly WikiTocEntry[]): string {
  if (toc.length < MIN_TOC_ENTRIES) return "";
  const items = toc
    .map((e) => `<li><a href="#${e.id}">${escapeHtml(e.text)}</a></li>`)
    .join("");
  return `<nav class="toc" aria-labelledby="toc-title"><p class="toc__title" id="toc-title">On this page</p><ol>${items}</ol></nav>`;
}

/** Puts the contents list after the article header, where the layout CSS expects it. */
export function insertToc(html: string, tocHtml: string): string {
  if (!tocHtml) return html;
  const marker = "</header>";
  const at = html.indexOf(marker);
  if (at === -1) return html;
  const end = at + marker.length;
  return html.slice(0, end) + tocHtml + html.slice(end);
}
