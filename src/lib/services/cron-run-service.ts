import { and, desc, eq, sql } from "drizzle-orm";
import { cronRunsTable } from "@drizzle/auth-ops-schema";
import { db } from "@lib/db";
import { isMissingSchemaError } from "@lib/server/missing-schema";

/**
 * Claim `job` for `period` (e.g. a UTC date). False when a run for the
 * period already finished or is in flight, so doubled cron deliveries skip.
 * A failed run can be claimed again.
 */
export async function claimCronRun(
  job: string,
  period: string,
): Promise<boolean> {
  try {
    return await claim(job, period);
  } catch (error) {
    // cron_runs not migrated yet: run without the duplicate guard.
    if (isMissingSchemaError(error)) {
      console.warn("cron_runs missing; running without a run record.");
      return true;
    }
    throw error;
  }
}

async function claim(job: string, period: string): Promise<boolean> {
  const inserted = await db
    .insert(cronRunsTable)
    .values({ job, period })
    .onConflictDoNothing()
    .returning({ job: cronRunsTable.job });
  if (inserted.length > 0) return true;
  const retried = await db
    .update(cronRunsTable)
    .set({ status: "running", startedAt: sql`now()`, finishedAt: null })
    .where(
      and(
        eq(cronRunsTable.job, job),
        eq(cronRunsTable.period, period),
        eq(cronRunsTable.status, "failed"),
      ),
    )
    .returning({ job: cronRunsTable.job });
  return retried.length > 0;
}

export async function finishCronRun(
  job: string,
  period: string,
  status: "done" | "failed",
  detail: Record<string, unknown>,
): Promise<void> {
  try {
    await db
      .update(cronRunsTable)
      .set({ status, detail, finishedAt: sql`now()` })
      .where(and(eq(cronRunsTable.job, job), eq(cronRunsTable.period, period)));
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
  }
}

export type CronRunRow = typeof cronRunsTable.$inferSelect;

export async function latestCronRuns(
  job: string,
  limit = 5,
): Promise<CronRunRow[]> {
  return db
    .select()
    .from(cronRunsTable)
    .where(eq(cronRunsTable.job, job))
    .orderBy(desc(cronRunsTable.startedAt))
    .limit(limit);
}
