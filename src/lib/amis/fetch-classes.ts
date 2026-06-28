import { extractClassRows } from "./normalize-class";
import type { AmisClassRow, AmisFetchOptions } from "./types";

const AMIS_CLASSES_URL =
  "https://api-amis.uplb.edu.ph/api/students/classes";

/** AMIS-friendly batch size (verified against midyear term 1252). */
export const AMIS_DEFAULT_PAGE_SIZE = 10_000;

/** Pause between page requests so imports do not hammer AMIS. */
export const AMIS_DEFAULT_PAGE_DELAY_MS = 400;

function asNested(
  obj: Record<string, unknown>,
  path: string[],
): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current == null || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function readNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export type AmisPageMeta = {
  total: number | null;
  lastPage: number;
};

/** Read pagination metadata from AMIS list responses (`classes.total`, `last_page`, etc.). */
export function readAmisPageMeta(payload: unknown, page: number): AmisPageMeta {
  const obj =
    payload !== null && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const total =
    readNumber(obj.total) ??
    readNumber(asNested(obj, ["classes", "total"]));
  const lastPageRaw =
    readNumber(obj.last_page) ??
    readNumber(asNested(obj, ["classes", "last_page"]));
  const to =
    readNumber(obj.to) ?? readNumber(asNested(obj, ["classes", "to"]));

  let lastPage = lastPageRaw ?? page;
  if (total != null && to != null && to >= total) {
    lastPage = page;
  }

  return { total, lastPage };
}

function buildClassesUrl(termId: number, page: number, pageSize: number) {
  const params = new URLSearchParams({
    page: String(page),
    items: String(pageSize),
    status: "Active",
    by_term_type: "true",
    term_id: String(termId),
    course_code_like: "--",
    section_like: "--",
    class_status: "--",
  });
  return `${AMIS_CLASSES_URL}?${params.toString()}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAmisPage(
  options: AmisFetchOptions,
  page: number,
  pageSize: number,
  headers: Record<string, string>,
) {
  const response = await fetch(
    buildClassesUrl(options.termId, page, pageSize),
    { headers },
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof (payload as { message: unknown }).message === "string"
        ? (payload as { message: string }).message
        : `HTTP ${response.status}`;
    throw new Error(`AMIS fetch failed (page ${page}): ${message}`);
  }

  return payload;
}

export async function fetchAmisClasses(
  options: AmisFetchOptions,
): Promise<AmisClassRow[]> {
  const pageSize = options.pageSize ?? AMIS_DEFAULT_PAGE_SIZE;
  const pageDelayMs = options.pageDelayMs ?? AMIS_DEFAULT_PAGE_DELAY_MS;
  const headers: Record<string, string> = {
    accept: "application/json, text/plain, */*",
    authorization: `Bearer ${options.bearerToken}`,
  };
  if (options.sessionId) {
    headers["x-session-id"] = options.sessionId;
  }

  const rows: AmisClassRow[] = [];
  let page = 1;
  let lastPage = 1;
  let expectedTotal: number | null = null;

  do {
    if (page > 1 && pageDelayMs > 0) {
      await sleep(pageDelayMs);
    }

    const payload = await fetchAmisPage(options, page, pageSize, headers);
    const pageRows = extractClassRows(payload);
    const meta = readAmisPageMeta(payload, page);

    if (pageRows.length === 0) {
      break;
    }

    if (expectedTotal == null && meta.total != null) {
      expectedTotal = meta.total;
    }

    lastPage = meta.lastPage;
    rows.push(...pageRows);

    console.log(
      `AMIS page ${page}/${lastPage}: ${pageRows.length} rows` +
        (meta.total != null ? ` (${rows.length}/${meta.total} total)` : ""),
    );

    if (pageRows.length < pageSize) {
      break;
    }

    page += 1;
  } while (page <= lastPage);

  if (rows.length === 0) {
    throw new Error(
      "AMIS response did not contain class rows — check token, term_id, or response shape.",
    );
  }

  if (expectedTotal != null && rows.length !== expectedTotal) {
    console.warn(
      `AMIS reported ${expectedTotal} classes but fetched ${rows.length}. Some rows may be missing.`,
    );
  }

  return rows;
}
