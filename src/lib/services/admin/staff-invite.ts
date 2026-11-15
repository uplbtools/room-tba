import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import type { SessionUser } from '#lib/admin/auth.js';
import { staffInvitesTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { isResendConfigured, sendEmail } from '#lib/utils/email/resend.js';
import { SITE_URL } from '#lib/utils/site.js';
import { markEmailVerified } from './email-verification.js';
import { AccountActionError, type AdminManagedUser, createAdminUser } from './user.js';

const INVITE_TTL_DAYS = 7;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_WITH_ARTICLE: Record<SessionUser['role'], string> = {
	admin: 'an admin',
	editor: 'an editor',
	contributor: 'a contributor'
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const pendingColumns = {
	id: staffInvitesTable.id,
	email: staffInvitesTable.email,
	displayName: staffInvitesTable.displayName,
	role: staffInvitesTable.role,
	expiresAt: staffInvitesTable.expiresAt,
	createdAt: staffInvitesTable.createdAt
};

export type PendingInvite = {
	id: number;
	email: string;
	displayName: string | null;
	role: SessionUser['role'];
	expiresAt: string;
	createdAt: string;
};

const isPending = () =>
	and(isNull(staffInvitesTable.acceptedAt), gt(staffInvitesTable.expiresAt, sql`now()`));

export async function listPendingInvites(): Promise<PendingInvite[]> {
	return db
		.select(pendingColumns)
		.from(staffInvitesTable)
		.where(isPending())
		.orderBy(desc(staffInvitesTable.createdAt));
}

export async function createStaffInvite(input: {
	email: string;
	role: SessionUser['role'];
	displayName?: string | null;
	invitedBy: Pick<SessionUser, 'id' | 'displayName' | 'username'>;
}) {
	const email = input.email.trim().toLowerCase();
	if (!EMAIL_PATTERN.test(email) || email.length > 255) {
		throw new AccountActionError('Enter a valid email address.');
	}
	const token = randomBytes(32).toString('base64url');

	const [invite] = await db
		.insert(staffInvitesTable)
		.values({
			email,
			displayName: input.displayName?.trim().slice(0, 100) || null,
			role: input.role,
			tokenHash: hashToken(token),
			invitedBy: input.invitedBy.id,
			expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString()
		})
		.returning(pendingColumns);
	if (!invite) throw new AccountActionError("Couldn't create the invite.", 500);

	const link = `${SITE_URL}/invite?token=${encodeURIComponent(token)}`;
	let emailed = false;
	if (isResendConfigured()) {
		const inviter = input.invitedBy.displayName || input.invitedBy.username;
		try {
			await sendEmail({
				to: [email],
				subject: "You're invited to help edit Room TBA",
				text: [
					`${inviter} invited you to join Room TBA as ${ROLE_WITH_ARTICLE[input.role]}.`,
					'',
					`Choose your username and password here: ${link}`,
					'',
					`This link works once and expires in ${INVITE_TTL_DAYS} days. If you weren't expecting it, ignore this email.`
				].join('\n')
			});
			emailed = true;
		} catch (error) {
			console.error('Staff invite email failed:', error);
		}
	}
	return { invite, emailed, inviteUrl: emailed ? null : link };
}

export async function revokeInvite(id: number): Promise<void> {
	await db
		.update(staffInvitesTable)
		.set({ expiresAt: sql`now()` })
		.where(and(eq(staffInvitesTable.id, id), isNull(staffInvitesTable.acceptedAt)));
}

export async function findUsableInvite(token: string): Promise<PendingInvite | null> {
	if (!token) return null;
	const [row] = await db
		.select(pendingColumns)
		.from(staffInvitesTable)
		.where(and(eq(staffInvitesTable.tokenHash, hashToken(token)), isPending()))
		.limit(1);
	return row ?? null;
}

/** Claims the invite first so a double submit can't create two accounts. */
export async function acceptStaffInvite(input: {
	token: string;
	username: string;
	password: string;
	displayName?: string | null;
}): Promise<AdminManagedUser> {
	const [claimed] = await db
		.update(staffInvitesTable)
		.set({ acceptedAt: sql`now()` })
		.where(and(eq(staffInvitesTable.tokenHash, hashToken(input.token)), isPending()))
		.returning();
	if (!claimed) throw new AccountActionError('This invite is invalid, used, or expired.', 400);
	try {
		const user = await createAdminUser({
			username: input.username,
			displayName: input.displayName?.trim() || claimed.displayName || undefined,
			email: claimed.email,
			password: input.password,
			role: claimed.role
		});
		await db
			.update(staffInvitesTable)
			.set({ acceptedUserId: user.id })
			.where(eq(staffInvitesTable.id, claimed.id));
		await markEmailVerified(user.id, claimed.email).catch((error) =>
			console.error('Marking the invited email verified failed:', error)
		);
		return user;
	} catch (error) {
		await db
			.update(staffInvitesTable)
			.set({ acceptedAt: null })
			.where(eq(staffInvitesTable.id, claimed.id));
		throw error;
	}
}
