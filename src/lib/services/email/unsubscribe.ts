import { sql } from 'drizzle-orm';
import { createSignedToken, verifySignedToken } from '#lib/admin/signed-token.js';
import { db } from '#lib/utils/db.js';
import {
	type EmailTopic,
	parseUnsubscribeToken,
	type UnsubscribeTokenPayload,
	unsubscribeFooter
} from '#lib/utils/email/unsubscribe-core.js';
import { SITE_URL } from '#lib/utils/site.js';

const TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60;

export function unsubscribeFooterFor(userId: number, topic: EmailTopic): string {
	const token = createSignedToken<UnsubscribeTokenPayload>(
		{ purpose: 'unsubscribe', userId, topic },
		TOKEN_TTL_SECONDS
	);
	return unsubscribeFooter(topic, SITE_URL, token);
}

export function readUnsubscribeToken(token: string): UnsubscribeTokenPayload | null {
	try {
		return parseUnsubscribeToken(verifySignedToken(token));
	} catch {
		return null;
	}
}

export async function setTopicEnabled(
	userId: number,
	topic: EmailTopic,
	enabled: boolean
): Promise<void> {
	const column = topic === 'digest' ? sql`digest` : sql`review_notices`;
	await db.execute(sql`
		INSERT INTO notification_preferences (user_id, ${column})
		SELECT id, ${enabled} FROM admin_users WHERE id = ${userId}
		ON CONFLICT (user_id) DO UPDATE SET ${column} = ${enabled}, updated_at = now()
	`);
}

export async function isDigestEnabled(userId: number): Promise<boolean> {
	const result = await db.execute<{ digest: boolean }>(
		sql`SELECT digest FROM notification_preferences WHERE user_id = ${userId}`
	);
	return result.rows[0]?.digest ?? true;
}
