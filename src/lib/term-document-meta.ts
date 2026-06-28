import { termSeoPhrase } from "./term-label";
import { withTermQuery } from "./term-url";

let baseDocumentTitle: string | null = null;

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setOg(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function updateTermAwareDocumentMeta(options: {
  baseTitle: string;
  baseDescription: string;
  canonicalPath: string;
  termLabel: string | null;
  termId: number | null;
  defaultTermId: number | null;
}) {
  if (typeof document === "undefined") return;

  if (baseDocumentTitle === null) {
    baseDocumentTitle = document.title;
  }

  const termPhrase = options.termLabel
    ? termSeoPhrase({ label: options.termLabel })
    : null;
  const title = termPhrase
    ? `${options.baseTitle} (${termPhrase}) | Room TBA`
    : `${options.baseTitle} | Room TBA`;
  const description = termPhrase
    ? `${options.baseDescription} Schedules shown for ${termPhrase}.`
    : options.baseDescription;

  document.title = title;
  setMeta("description", description);
  setOg("og:title", title);
  setOg("og:description", description);

  const canonicalPath = withTermQuery(
    options.canonicalPath,
    options.termId,
    options.defaultTermId,
  );
  const canonicalUrl = new URL(
    canonicalPath,
    window.location.origin,
  ).toString();
  setOg("og:url", canonicalUrl);

  let link = document.querySelector('link[rel="canonical"]');
  if (link) {
    link.setAttribute("href", canonicalUrl);
  }
}

export function resetDocumentMeta() {
  if (typeof document === "undefined" || baseDocumentTitle === null) return;
  document.title = baseDocumentTitle;
}
