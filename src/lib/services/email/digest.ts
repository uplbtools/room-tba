import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { emailIsVerifiedSql } from '#lib/services/admin/email-verification.js';
import { unsubscribeFooterFor } from '#lib/services/email/unsubscribe.js';
import { adminUsersTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { buildProposalDigest } from '#lib/utils/email/digest-core.js';
import { isResendConfigured, sendEmail } from '#lib/utils/email/resend.js';
import { listPendingProposals } from '#lib/services/contribution/proposal-action.js';
import { SITE_URL } from '#lib/utils/site.js';

export async function listDigestRecipients(): Promise<{ id: number; email: string }[]> {
	const rows = await db
		.select({ id: adminUsersTable.id, email: adminUsersTable.email })
		.from(adminUsersTable)
		.where(
			and(
				eq(adminUsersTable.isActive, true),
				isNotNull(adminUsersTable.email),
				sql`${adminUsersTable.email} <> ''`,
				inArray(adminUsersTable.role, ['admin', 'editor'] as const),
				emailIsVerifiedSql,
				sql`NOT EXISTS (
					SELECT 1 FROM notification_preferences np
					WHERE np.user_id = ${adminUsersTable.id} AND np.digest = false
				)`
			)
		);
	return rows.map((row) => ({ id: row.id, email: (row.email ?? '').trim().toLowerCase() }));
}

export type DigestRunResult = {
	skipped: 'unconfigured' | 'no_pending' | 'no_recipients' | null;
	pendingCount: number;
	recipientCount: number;
};

export async function sendProposalDigest(): Promise<DigestRunResult> {
	if (!isResendConfigured()) {
		return { skipped: 'unconfigured', pendingCount: 0, recipientCount: 0 };
	}

	const proposals = await listPendingProposals();
	const digest = buildProposalDigest(proposals, SITE_URL);
	if (!digest) {
		return { skipped: 'no_pending', pendingCount: 0, recipientCount: 0 };
	}

	const recipients = await listDigestRecipients();
	if (recipients.length === 0) {
		return {
			skipped: 'no_recipients',
			pendingCount: proposals.length,
			recipientCount: 0
		};
	}

	// Individual sends keep recipient addresses private to each editor.
	for (const { id, email } of recipients) {
		try {
			await sendEmail({
				to: [email],
				subject: digest.subject,
				text: digest.text + unsubscribeFooterFor(id, 'digest')
			});
		} catch (error) {
			console.error(`Proposal digest to ${email} failed:`, error);
		}
	}

	return {
		skipped: null,
		pendingCount: proposals.length,
		recipientCount: recipients.length
	};
}
