import { eq, desc, sql } from "drizzle-orm";
import { classesTable, termsTable } from "@drizzle/schema";
import { db } from "@lib/db";
import { resolveDefaultTermFromList } from "@lib/term-calendar";
import type { Term, TermWithCount } from "@lib/types";

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
        classesImportedAt: termsTable.classesImportedAt,
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
 * Resolve the term visitors should see by default:
 * 1) instructional window containing today (Asia/Manila date)
 * 2) legacy `is_default` flag (between terms / missing dates)
 * 3) newest active term
 */
export async function getDefaultTerm(): Promise<Term | null> {
  try {
    const terms = await db
      .select()
      .from(termsTable)
      .where(eq(termsTable.isActive, true))
      .orderBy(desc(termsTable.sortOrder), desc(termsTable.id));

    return resolveDefaultTermFromList(terms);
  } catch (e) {
    console.error("Failed to resolve default term:", e);
    return null;
  }
}
