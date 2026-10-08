import { desc, eq, gte, sql } from "drizzle-orm";
import { emailLogTable } from "@drizzle/auth-ops-schema";
import { db } from "@lib/db";
import { isMissingSchemaError } from "@lib/server/missing-schema";

export type EmailAttempt = {
  to: string[];
  template: string;
  status: "sent" | "failed";
  providerId: string | null;
  error: string | null;
  idempotencyKey: string | null;
};

/** Best effort: a logging failure must never fail the send it describes. */
export async function recordEmailAttempt(attempt: EmailAttempt): Promise<void> {
  try {
    await db.insert(emailLogTable).values(
      attempt.to.map((to) => ({
        toAddress: to,
        template: attempt.template,
        status: attempt.status,
        providerId: attempt.providerId,
        error: attempt.error?.slice(0, 1000) ?? null,
        idempotencyKey: attempt.idempotencyKey,
      })),
    );
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.warn("email_log missing; send not recorded.");
      return;
    }
    console.error("email_log insert failed:", error);
  }
}

export type EmailFailure = {
  id: number;
  toAddress: string;
  template: string;
  error: string | null;
  createdAt: string;
};

export type EmailHealth = {
  sent7d: number;
  failed7d: number;
  recentFailures: EmailFailure[];
};

/** Staff dashboard summary: last 7 days of sends and the latest failures. */
export async function emailHealth(): Promise<EmailHealth> {
  const since = sql`now() - interval '7 days'`;
  const counts = await db
    .select({ status: emailLogTable.status, c: sql<number>`count(*)` })
    .from(emailLogTable)
    .where(gte(emailLogTable.createdAt, since))
    .groupBy(emailLogTable.status);
  const recentFailures = await db
    .select({
      id: emailLogTable.id,
      toAddress: emailLogTable.toAddress,
      template: emailLogTable.template,
      error: emailLogTable.error,
      createdAt: emailLogTable.createdAt,
    })
    .from(emailLogTable)
    .where(eq(emailLogTable.status, "failed"))
    .orderBy(desc(emailLogTable.createdAt))
    .limit(5);
  const count = (status: string) =>
    Number(counts.find((r) => r.status === status)?.c ?? 0);
  return { sent7d: count("sent"), failed7d: count("failed"), recentFailures };
}
