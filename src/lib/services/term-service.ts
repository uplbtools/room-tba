import { and, desc, eq, sql } from "drizzle-orm";
import { classesTable, termsTable } from "../../../drizzle/schema";
import { db } from "../db";
import type { Term, TermWithCount } from "../types";

/**
 * All terms with the number of classes tagged to each, ordered for display
 * (newest/most relevant first). Returns an empty list if the terms table is
 * missing (e.g. migration not yet applied) so callers can degrade gracefully.
 */
export async function getAllTerms(): Promise<TermWithCount[]> {
  try {
    const rows = await db
      .select({
        id: termsTable.id,
        label: termsTable.label,
        schoolYear: termsTable.schoolYear,
        semester: termsTable.semester,
        startsOn: termsTable.startsOn,
        endsOn: termsTable.endsOn,
        isDefault: termsTable.isDefault,
        isActive: termsTable.isActive,
        sortOrder: termsTable.sortOrder,
        version: termsTable.version,
        updatedAt: termsTable.updatedAt,
        classCount: sql<number>`count(${classesTable.id})::int`,
      })
      .from(termsTable)
      .leftJoin(classesTable, eq(classesTable.termId, termsTable.id))
      .groupBy(termsTable.id)
      .orderBy(desc(termsTable.sortOrder), desc(termsTable.id));
    return rows;
  } catch (e) {
    console.error("Failed to fetch terms:", e);
    return [];
  }
}

/**
 * The single default term for anonymous visitors. Falls back to the newest
 * active term, then null. Never throws so SSG/SSR data loading stays resilient
 * when the terms table is empty or not yet migrated.
 */
export async function getDefaultTerm(): Promise<Term | null> {
  try {
    const [byFlag] = await db
      .select()
      .from(termsTable)
      .where(and(eq(termsTable.isDefault, true), eq(termsTable.isActive, true)))
      .limit(1);
    if (byFlag) return byFlag;

    const [newestActive] = await db
      .select()
      .from(termsTable)
      .where(eq(termsTable.isActive, true))
      .orderBy(desc(termsTable.sortOrder), desc(termsTable.id))
      .limit(1);
    return newestActive ?? null;
  } catch (e) {
    console.error("Failed to resolve default term:", e);
    return null;
  }
}
