import { getJSONFetch } from "@lib/fetch";
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
  if (options.limit != null) {
    params.set("limit", String(options.limit));
  }
  if (options.offset != null) {
    params.set("offset", String(options.offset));
  }
  params.set("limit", String(options.limit ?? 25));
  if (options.offset != null) {
    params.set("offset", String(options.offset));
  }

  return getJSONFetch<ClassQueryPage>(`/api/classes?${params.toString()}`);
}
