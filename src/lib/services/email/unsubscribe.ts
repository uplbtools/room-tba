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

export async function unsubscribeFromTopic(userId: number, topic: EmailTopic): Promise<void> {
	const column = topic === 'digest' ? sql`digest` : sql`review_notices`;
	await db.execute(sql`
		INSERT INTO notification_preferences (user_id, ${column})
		SELECT id, false FROM admin_users WHERE id = ${userId}
		ON CONFLICT (user_id) DO UPDATE SET ${column} = false, updated_at = now()
	`);
}
