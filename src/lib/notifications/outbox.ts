import { and, eq, lte, sql } from "drizzle-orm";
import { notificationOutboxTable } from "@drizzle/auth-ops-schema";
import { db } from "@lib/db";
import { afterResponse } from "@lib/server/after-response";
import { getNotificationAdapter } from "./index";
import { NoOpNotificationAdapter } from "./noop-adapter";
import { outboxOutcome } from "./outbox-core";
import type { NotificationEvent } from "./types";

type OutboxRow = typeof notificationOutboxTable.$inferSelect;

function eventKey(event: NotificationEvent): string {
  return (
    event.idempotencyKey ??
    `${event.type}:${event.occurredAt}:${crypto.randomUUID()}`
  );
}

/** One delivery attempt for a claimed row; records the outcome. */
async function deliver(row: OutboxRow): Promise<boolean> {
  const attempts = row.attempts + 1;
  let ok = false;
  let error: string | null = null;
  try {
    await getNotificationAdapter().notify(row.event as NotificationEvent);
    ok = true;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  const outcome = outboxOutcome(ok, attempts);
  await db
    .update(notificationOutboxTable)
    .set({
      attempts,
      status: outcome.status,
      lastError: error?.slice(0, 1000) ?? null,
      sentAt: outcome.status === "sent" ? sql`now()` : null,
      ...(outcome.status === "pending"
        ? { nextAttemptAt: outcome.nextAttemptAt.toISOString() }
        : {}),
    })
    .where(eq(notificationOutboxTable.id, row.id));
  if (!ok) {
    console.error(
      `Notification ${row.idempotencyKey} attempt ${attempts} failed (${outcome.status}):`,
      error,
    );
  }
  return ok;
}

/**
 * Claim a pending row for delivery by pushing its next attempt out, so the
 * cron sweep and an after-response attempt never both send it.
 */
async function claim(id: number): Promise<OutboxRow | null> {
  const [row] = await db
    .update(notificationOutboxTable)
    .set({ nextAttemptAt: sql`now() + interval '5 minutes'` })
    .where(
      and(
        eq(notificationOutboxTable.id, id),
        eq(notificationOutboxTable.status, "pending"),
        lte(notificationOutboxTable.nextAttemptAt, sql`now()`),
      ),
    )
    .returning();
  return row ?? null;
}

/**
 * Queue a gateway event durably, then try to deliver it after the response.
 * Resolves once the row is stored (or immediately on Vercel), never throws:
 * the caller's own write is the system of record. When the gateway is not
 * configured there is nothing to deliver, so nothing is queued.
 */
export async function enqueueNotification(
  event: NotificationEvent,
): Promise<void> {
  if (getNotificationAdapter() instanceof NoOpNotificationAdapter) return;
  let row: OutboxRow | null = null;
  try {
    const [inserted] = await db
      .insert(notificationOutboxTable)
      .values({
        eventType: event.type,
        idempotencyKey: eventKey(event),
        event,
      })
      .onConflictDoNothing({ target: notificationOutboxTable.idempotencyKey })
      .returning();
    row = inserted ?? null;
  } catch (error) {
    // Outbox table missing (migration not applied yet) or DB hiccup: fall
    // back to one direct attempt rather than dropping the event.
    console.error("Notification outbox insert failed:", error);
    await afterResponse(getNotificationAdapter().notify(event));
    return;
  }
  // Duplicate idempotency key: already queued or sent.
  if (!row) return;
  const id = row.id;
  await afterResponse(
    (async () => {
      const claimed = await claim(id);
      if (claimed) await deliver(claimed);
    })(),
  );
}

export type OutboxSweepResult = {
  attempted: number;
  sent: number;
  failed: number;
};

/** Retry due pending rows (cron). Oldest first, bounded per run. */
export async function retryDueNotifications(
  limit = 25,
): Promise<OutboxSweepResult> {
  const claimed = await db.execute<{ id: number }>(sql`
    UPDATE notification_outbox
    SET next_attempt_at = now() + interval '5 minutes'
    WHERE id IN (
      SELECT id FROM notification_outbox
      WHERE status = 'pending' AND next_attempt_at <= now()
      ORDER BY next_attempt_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id
  `);
  const ids = claimed.rows.map((r: { id: number }) => Number(r.id));
  let sent = 0;
  for (const id of ids) {
    const [row] = await db
      .select()
      .from(notificationOutboxTable)
      .where(eq(notificationOutboxTable.id, id));
    if (row && (await deliver(row))) sent += 1;
  }
  return { attempted: ids.length, sent, failed: ids.length - sent };
}

export type OutboxHealth = { pending: number; dead: number };

export async function outboxHealth(): Promise<OutboxHealth> {
  const rows = await db
    .select({
      status: notificationOutboxTable.status,
      c: sql<number>`count(*)`,
    })
    .from(notificationOutboxTable)
    .where(sql`${notificationOutboxTable.status} in ('pending', 'dead')`)
    .groupBy(notificationOutboxTable.status);
  const count = (status: string) =>
    Number(rows.find((r) => r.status === status)?.c ?? 0);
  return { pending: count("pending"), dead: count("dead") };
}
