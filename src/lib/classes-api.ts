import { getJSONFetch } from "@lib/local/data/utils";
import type { ClassMapValue } from "@lib/types";

export type ClassQueryPage = {
  rows: ClassMapValue[];
  total: number;
};

export async function fetchClassPage(options: {
  termId?: number | null;
  courseCodePrefix?: string;
  limit?: number;
  offset?: number;
}): Promise<ClassQueryPage> {
  const params = new URLSearchParams();
  if (options.termId != null) {
    params.set("term_id", String(options.termId));
  }
  if (options.courseCodePrefix?.trim()) {
    params.set("course_code", options.courseCodePrefix.trim());
  }
  params.set("limit", String(options.limit ?? 25));
  params.set("offset", String(options.offset ?? 0));

  return getJSONFetch<ClassQueryPage>(`/api/classes?${params.toString()}`);
}

// The /api/classes endpoint caps `limit` at 100, so a course with more sections
// than that (e.g. HK 12 with 147) never fits in one page. Walk the offsets to
// `total` so callers get every section.
const PAGE_SIZE = 100;
// ponytail: safety cap so a bad `total` can't loop forever; 20 pages = 2000
// sections, far above any real course. Raise if a course ever exceeds it.
const MAX_PAGES = 20;

export async function fetchAllClasses(options: {
  termId?: number | null;
  courseCodePrefix?: string;
}): Promise<ClassQueryPage> {
  const first = await fetchClassPage({
    ...options,
    limit: PAGE_SIZE,
    offset: 0,
  });
  const rows = first.rows.slice();
  let pages = 1;
  while (rows.length < first.total && pages < MAX_PAGES) {
    const next = await fetchClassPage({
      ...options,
      limit: PAGE_SIZE,
      offset: rows.length,
    });
    if (next.rows.length === 0) break;
    rows.push(...next.rows);
    pages++;
  }
  return { rows, total: first.total };
}
