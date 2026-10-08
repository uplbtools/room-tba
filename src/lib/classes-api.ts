import { getJSONFetch } from "@lib/local/data/utils";
import type { ClassMapValue } from "@lib/types";

export type ClassQueryPage = {
  rows: ClassMapValue[];
  /** Opaque token for the next page; null on the last page. */
  nextCursor: string | null;
  hasMore: boolean;
};

export async function fetchClassPage(options: {
  termId?: number | null;
  courseCodePrefix?: string;
  limit?: number;
  cursor?: string | null;
  /** Abort after this long (search must not wait on a hung request). */
  timeoutMs?: number;
}): Promise<ClassQueryPage> {
  const params = new URLSearchParams();
  if (options.termId != null) {
    params.set("term_id", String(options.termId));
  }
  if (options.courseCodePrefix?.trim()) {
    params.set("course_code", options.courseCodePrefix.trim());
  }
  params.set("limit", String(options.limit ?? 25));
  if (options.cursor) {
    params.set("cursor", options.cursor);
  }

  return getJSONFetch<ClassQueryPage>(
    `/api/classes?${params.toString()}`,
    options.timeoutMs,
  );
}

// The /api/classes endpoint caps `limit` at 100, so a course with more sections
// than that (e.g. HK 12 with 147) never fits in one page. Walk the cursor chain
// so callers get every section.
const PAGE_SIZE = 100;
// ponytail: safety cap so a bad cursor chain can't loop forever; 20 pages =
// 2000 sections, far above any real course. Raise if a course ever exceeds it.
const MAX_PAGES = 20;

export async function fetchAllClasses(options: {
  termId?: number | null;
  courseCodePrefix?: string;
}): Promise<ClassQueryPage> {
  const rows: ClassMapValue[] = [];
  let cursor: string | null = null;
  for (let pages = 0; pages < MAX_PAGES; pages++) {
    const page = await fetchClassPage({ ...options, limit: PAGE_SIZE, cursor });
    rows.push(...page.rows);
    if (!page.hasMore || !page.nextCursor || page.rows.length === 0) {
      return { rows, nextCursor: null, hasMore: false };
    }
    cursor = page.nextCursor;
  }
  return { rows, nextCursor: cursor, hasMore: true };
}
