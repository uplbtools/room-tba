export const TERM_QUERY_PARAM = "term";

export function parseTermIdFromSearch(
  search: string,
): number | null {
  const raw = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  ).get(TERM_QUERY_PARAM);
  if (raw === null || raw === "") return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

/** Append ?term= when id differs from the site default (omit for default term). */
export function withTermQuery(
  path: string,
  termId: number | null | undefined,
  defaultTermId: number | null | undefined = null,
): string {
  if (termId == null || termId === defaultTermId) return path;

  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://room-tba.uplbtools.me";
  const url = new URL(path, base);
  url.searchParams.set(TERM_QUERY_PARAM, String(termId));
  return `${url.pathname}${url.search}`;
}

export function syncTermQueryParam(
  termId: number | null | undefined,
  defaultTermId: number | null | undefined,
) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (termId == null || termId === defaultTermId) {
    url.searchParams.delete(TERM_QUERY_PARAM);
  } else {
    url.searchParams.set(TERM_QUERY_PARAM, String(termId));
  }

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;

  window.history.replaceState(window.history.state, "", next);
}
