import { eq } from "drizzle-orm";
import { plannerPlansTable } from "@drizzle/schema";
import { db } from "@lib/db";

/** The stored planner blob for a user, or null if they've never saved one. */
export async function getPlannerData(userId: number): Promise<unknown | null> {
  const rows = await db
    .select({ data: plannerPlansTable.data })
    .from(plannerPlansTable)
    .where(eq(plannerPlansTable.userId, userId))
    .limit(1);
  return rows[0]?.data ?? null;
}

/** Upsert the user's planner blob (one row per user). */
export async function savePlannerData(
  userId: number,
  data: unknown,
): Promise<void> {
  const updatedAt = new Date().toISOString();
  await db
    .insert(plannerPlansTable)
    .values({ userId, data, updatedAt })
    .onConflictDoUpdate({
      target: plannerPlansTable.userId,
      set: { data, updatedAt },
    });
}
