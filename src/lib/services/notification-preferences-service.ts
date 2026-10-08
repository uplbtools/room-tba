import { and, eq, inArray } from "drizzle-orm";
import { notificationPreferencesTable } from "@drizzle/auth-ops-schema";
import { db } from "@lib/db";
import { isMissingSchemaError } from "@lib/server/missing-schema";
import type { EmailTopic } from "@lib/email/unsubscribe-core";

export type NotificationPreferences = {
  digest: boolean;
  reviewNotices: boolean;
};

const DEFAULTS: NotificationPreferences = { digest: true, reviewNotices: true };

const COLUMN: Record<EmailTopic, "digest" | "reviewNotices"> = {
  digest: "digest",
  review_notices: "reviewNotices",
};

export async function getNotificationPreferences(
  userId: number,
): Promise<NotificationPreferences> {
  const [row] = await db
    .select({
      digest: notificationPreferencesTable.digest,
      reviewNotices: notificationPreferencesTable.reviewNotices,
    })
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);
  return row ?? { ...DEFAULTS };
}

export async function updateNotificationPreferences(
  userId: number,
  patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const next = { ...(await getNotificationPreferences(userId)), ...patch };
  await db
    .insert(notificationPreferencesTable)
    .values({ userId, ...next })
    .onConflictDoUpdate({
      target: notificationPreferencesTable.userId,
      set: { ...next, updatedAt: new Date().toISOString() },
    });
  return next;
}

export async function unsubscribeFromTopic(
  userId: number,
  topic: EmailTopic,
): Promise<void> {
  await updateNotificationPreferences(userId, { [COLUMN[topic]]: false });
}

/**
 * Of `userIds`, the ones who switched `topic` off. Fails open to "nobody
 * opted out" only when the table is missing (pre-migration); other errors
 * propagate so a broken query cannot silently mail people who opted out.
 */
export async function optedOutUserIds(
  userIds: number[],
  topic: EmailTopic,
): Promise<Set<number>> {
  if (userIds.length === 0) return new Set();
  const column = notificationPreferencesTable[COLUMN[topic]];
  try {
    const rows = await db
      .select({ userId: notificationPreferencesTable.userId })
      .from(notificationPreferencesTable)
      .where(
        and(
          inArray(notificationPreferencesTable.userId, userIds),
          eq(column, false),
        ),
      );
    return new Set(rows.map((r) => r.userId));
  } catch (error) {
    if (isMissingSchemaError(error)) return new Set();
    throw error;
  }
}
