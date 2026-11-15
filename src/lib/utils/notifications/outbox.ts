import { and, eq, lte, sql } from 'drizzle-orm';
import { notificationOutboxTable } from '#lib/server/db/schema.js';
import { afterResponse } from '#lib/utils/after-response.js';
import { db } from '#lib/utils/db.js';
import { getNotificationAdapter, NoOpNotificationAdapter } from './index';
import { outboxOutcome } from './outbox-core';
import type { NotificationEvent } from './types';

type OutboxRow = typeof notificationOutboxTable.$inferSelect;

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
			sentAt: outcome.status === 'sent' ? sql`now()` : null,
			...(outcome.status === 'pending'
				? { nextAttemptAt: outcome.nextAttemptAt.toISOString() }
				: {})
		})
		.where(eq(notificationOutboxTable.id, row.id));
	if (!ok) {
		console.error(
			`Notification ${row.idempotencyKey} attempt ${attempts} failed (${outcome.status}):`,
			error
		);
	}
	return ok;
}

/** Push the row's next attempt out so the cron and the after-response try never both send it. */
async function claim(id: number): Promise<OutboxRow | null> {
	const [row] = await db
		.update(notificationOutboxTable)
		.set({ nextAttemptAt: sql`now() + interval '5 minutes'` })
		.where(
			and(
				eq(notificationOutboxTable.id, id),
				eq(notificationOutboxTable.status, 'pending'),
				lte(notificationOutboxTable.nextAttemptAt, sql`now()`)
			)
		)
		.returning();
	return row ?? null;
}

/** Store the event, then try to deliver it after the response. Never throws. */
export async function enqueueNotification(event: NotificationEvent): Promise<void> {
	if (getNotificationAdapter() instanceof NoOpNotificationAdapter) return;
	let row: OutboxRow | null = null;
	try {
		const [inserted] = await db
			.insert(notificationOutboxTable)
			.values({
				eventType: event.type,
				idempotencyKey:
					event.idempotencyKey ?? `${event.type}:${event.occurredAt}:${crypto.randomUUID()}`,
				event
			})
			.onConflictDoNothing({ target: notificationOutboxTable.idempotencyKey })
			.returning();
		row = inserted ?? null;
	} catch (error) {
		console.error('Notification outbox insert failed:', error);
		await afterResponse(getNotificationAdapter().notify(event));
		return;
	}
	if (!row) return;
	const id = row.id;
	await afterResponse(
		(async () => {
			const claimed = await claim(id);
			if (claimed) await deliver(claimed);
		})()
	);
}

/** Retry due pending rows, oldest first. */
export async function retryDueNotifications(limit = 25) {
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
	const ids = claimed.rows.map((r) => Number(r.id));
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
