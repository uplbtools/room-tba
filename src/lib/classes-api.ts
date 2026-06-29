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
