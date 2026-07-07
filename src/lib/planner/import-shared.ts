import { fetchClassPage } from "@lib/classes-api";
import type { DecodedSharePlan } from "./share-codec.js";
import { sectionNaturalKey, type PlannedSection } from "./types.js";

/**
 * Resolve a decoded `?plan=` payload against /api/classes. Refs that no
 * longer exist become stale TBA placeholders instead of being dropped.
 */
export async function resolveSharedPlan(decoded: DecodedSharePlan): Promise<{
  sections: PlannedSection[];
  missing: number;
}> {
  const courseCodes = [...new Set(decoded.refs.map((ref) => ref.courseCode))];
  const pages = await Promise.all(
    courseCodes.map((code) =>
      fetchClassPage({
        termId: decoded.termId,
        courseCodePrefix: code,
        limit: 100,
      }).then(
        (page) => page.rows,
        () => [],
      ),
    ),
  );
  const rowsByKey = new Map(
    pages
      .flat()
      .filter((row) => row.courseCode && row.section && row.type)
      .map((row) => [
        sectionNaturalKey({
          courseCode: row.courseCode ?? "",
          section: row.section ?? "",
          type: row.type ?? "",
        }),
        row,
      ]),
  );

  let missing = 0;
  const sections = decoded.refs.map((ref): PlannedSection => {
    const row = rowsByKey.get(sectionNaturalKey(ref));
    if (!row) {
      missing++;
      return {
        ...ref,
        schedule: ["TBA"],
        roomCode: null,
        courseTitle: null,
        stale: true,
      };
    }
    return {
      courseCode: ref.courseCode,
      section: ref.section,
      type: ref.type,
      schedule: row.schedule ?? ["TBA"],
      roomCode: row.roomCode ?? null,
      courseTitle: row.courseTitle ?? null,
    };
  });
  return { sections, missing };
}
