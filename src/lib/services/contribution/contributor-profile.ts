import { env } from '$env/dynamic/private';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/utils/db';
import {
	adminUsersTable,
	contributorProfileAuditsTable,
	contributorProfilesTable,
	contributorSocialLinksTable
} from '$lib/server/db/schema';
import { parseImageUrl } from '$lib/utils/r2-upload-core';
import {
	CONTRIBUTOR_BIO_MAX_LENGTH,
	CONTRIBUTOR_LINK_URL_MAX_LENGTH,
	SOCIAL_KIND_METADATA,
	hasDisallowedControlCharacters,
	hasPublicMessagingLink,
	normalizeSocialLinkInput,
	normalizeHttpsUrl,
	sortSocialLinks,
	validateSocialLinkMultiplicity,
	type ContributorSocialLinkInput,
	type SocialKind
} from '$lib/utils/contributor-profile';

export type ContributorRole = 'admin' | 'editor' | 'contributor';
export type ContributorRoleLabel = 'Admin' | 'Editor' | 'Contributor';
export type ContributorSocialLinkDTO = ContributorSocialLinkInput & {
	id: number;
	createdAt: string;
	updatedAt: string;
};
export type ContributorPublicSocialLink = { kind: SocialKind; label: string | null; url: string };
export type ContributorEditableProfile = {
	id: number;
	userId: number;
	slug: string;
	displayName: string;
	role: ContributorRoleLabel;
	bio: string;
	isPublic: boolean;
	isModeratorHidden: boolean;
	showInCredits: boolean;
	avatarUrl: string | null;
	version: number;
	updatedAt: string;
	socialLinks: ContributorSocialLinkDTO[];
};
export type ContributorPublicProfile = {
	slug: string;
	displayName: string;
	role: ContributorRoleLabel;
	bio: string;
	avatarUrl: string | null;
	socialLinks: ContributorPublicSocialLink[];
};
export type ContributorProfileUpdate = {
	version: number;
	bio: string;
	isPublic: boolean;
	showInCredits: boolean;
	messagingDisclosureAcknowledged: boolean;
	socialLinks: ContributorSocialLinkInput[];
};
export type ContributorProfileSnapshot = {
	slug: string;
	displayName: string;
	role: ContributorRoleLabel;
	bio: string;
	isPublic: boolean;
	isModeratorHidden: boolean;
	showInCredits: boolean;
	avatarUrl: string | null;
	moderationReason?: string;
	socialLinks: Array<{ kind: SocialKind; label: string | null; url: string; isPublic: boolean }>;
};
export type ContributorProfileAudit = {
	id: number;
	profileId: number;
	actorUserId: number | null;
	actorDisplayName: string | null;
	actorRole: ContributorRoleLabel | null;
	action: string;
	fromVersion: number | null;
	toVersion: number;
	before: ContributorProfileSnapshot | null;
	after: ContributorProfileSnapshot;
	createdAt: string;
};
export type ContributorAttribution = {
	name: string;
	avatarUrl: string | null;
	href: string | null;
};

export class ContributorProfileError extends Error {
	readonly status: number;
	readonly latestEditable: ContributorEditableProfile | null;
	constructor(
		message: string,
		status = 400,
		latestEditable: ContributorEditableProfile | null = null
	) {
		super(message);
		this.name = 'ContributorProfileError';
		this.status = status;
		this.latestEditable = latestEditable;
	}
}
export class ContributorProfileNotFoundError extends ContributorProfileError {
	constructor(message = 'Contributor profile not found.') {
		super(message, 404);
		this.name = 'ContributorProfileNotFoundError';
	}
}
export class ContributorProfileConflictError extends ContributorProfileError {
	constructor(latestEditable: ContributorEditableProfile) {
		super('Contributor profile changed on the server.', 409, latestEditable);
		this.name = 'ContributorProfileConflictError';
	}
}
export class ContributorProfileForbiddenError extends ContributorProfileError {
	constructor(message = 'You are not allowed to perform this action.') {
		super(message, 403);
		this.name = 'ContributorProfileForbiddenError';
	}
}

const MAX_SOCIAL_LINKS = 20;
const AUDIT_PAGE_SIZE = 50;
function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}
function assertExactKeys(
	value: Record<string, unknown>,
	keys: readonly string[],
	label: string
): void {
	const allowed = new Set(keys);
	for (const key of Object.keys(value))
		if (!allowed.has(key))
			throw new ContributorProfileError(`${label} contains unknown field: ${key}.`);
}
/** Normalize account usernames into immutable public profile slugs. */
export function normalizeContributorSlug(value: unknown): string {
	if (typeof value !== 'string')
		throw new ContributorProfileError('Contributor slug must be a string.');
	const slug = value
		.normalize('NFKD')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/gu, '-')
		.replace(/^-+|-+$/gu, '')
		.slice(0, 120);
	if (!slug) throw new ContributorProfileError('Contributor slug cannot be empty.');
	return slug;
}
function legacyProfileUrl(value: string): string | null {
	const trimmed = value.trim();
	if (
		!trimmed ||
		trimmed.length > CONTRIBUTOR_LINK_URL_MAX_LENGTH ||
		hasDisallowedControlCharacters(trimmed)
	) {
		return null;
	}
	try {
		const parsed = new URL(trimmed);
		if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash)
			return null;
		parsed.hostname = parsed.hostname.toLowerCase();
		return parsed.toString();
	} catch {
		return null;
	}
}
function roleLabel(role: ContributorRole): ContributorRoleLabel {
	return role === 'admin' ? 'Admin' : role === 'editor' ? 'Editor' : 'Contributor';
}
function profileAvatar(value: unknown): string | null {
	const parsed = parseImageUrl(value, env.R2_PUBLIC_URL, 'Avatar');
	return parsed.ok ? parsed.imageUrl : null;
}
function validateBio(value: unknown): string {
	if (typeof value !== 'string') throw new ContributorProfileError('Bio must be a string.');
	const bio = value.trim();
	if (bio.length > CONTRIBUTOR_BIO_MAX_LENGTH)
		throw new ContributorProfileError(
			`Bio cannot exceed ${CONTRIBUTOR_BIO_MAX_LENGTH} characters.`
		);
	if (hasDisallowedControlCharacters(bio, true))
		throw new ContributorProfileError('Bio contains invalid control characters.');
	return bio;
}
/** Parse and normalize the complete owner document before opening a transaction. */
function moderationReason(value: string | undefined): string {
	const reason = value?.trim() ?? '';
	if (!reason) throw new ContributorProfileError('Moderation reason is required.');
	if (reason.length > 500 || hasDisallowedControlCharacters(reason, true))
		throw new ContributorProfileError('Moderation reason is invalid.');
	return reason;
}
export function parseContributorProfileUpdate(
	value: unknown,
	options: { requireMessagingDisclosure?: boolean } = {}
): ContributorProfileUpdate {
	if (!isRecord(value))
		throw new ContributorProfileError('Contributor profile update must be an object.');
	assertExactKeys(
		value,
		[
			'version',
			'bio',
			'isPublic',
			'showInCredits',
			'messagingDisclosureAcknowledged',
			'socialLinks'
		],
		'Contributor profile update'
	);
	if (!Number.isSafeInteger(value.version) || (value.version as number) < 1)
		throw new ContributorProfileError('Version must be a positive integer.');
	if (typeof value.isPublic !== 'boolean' || typeof value.showInCredits !== 'boolean')
		throw new ContributorProfileError('Profile visibility values must be booleans.');
	if (typeof value.messagingDisclosureAcknowledged !== 'boolean')
		throw new ContributorProfileError('Messaging disclosure must be a boolean.');
	if (!Array.isArray(value.socialLinks))
		throw new ContributorProfileError('Social links must be an array.');
	if (value.socialLinks.length > MAX_SOCIAL_LINKS)
		throw new ContributorProfileError(`No more than ${MAX_SOCIAL_LINKS} social links are allowed.`);
	const socialLinks = value.socialLinks.map((link, index) => {
		try {
			return normalizeSocialLinkInput(link, index);
		} catch (error) {
			if (error instanceof Error) throw new ContributorProfileError(error.message);
			throw error;
		}
	});
	validateSocialLinkMultiplicity(socialLinks);
	if (
		options.requireMessagingDisclosure !== false &&
		hasPublicMessagingLink(socialLinks) &&
		!value.messagingDisclosureAcknowledged
	)
		throw new ContributorProfileError('Messaging links require explicit disclosure.');
	return {
		version: value.version as number,
		bio: validateBio(value.bio),
		isPublic: value.isPublic,
		showInCredits: value.showInCredits,
		messagingDisclosureAcknowledged: value.messagingDisclosureAcknowledged,
		socialLinks
	};
}
/** Alias for route packets that call the owner document a profile input. */
export const parseContributorProfileInput = parseContributorProfileUpdate;

function toEditable(
	profile: typeof contributorProfilesTable.$inferSelect,
	user: typeof adminUsersTable.$inferSelect,
	links: (typeof contributorSocialLinksTable.$inferSelect)[]
): ContributorEditableProfile {
	return {
		id: profile.id,
		userId: profile.userId,
		slug: profile.slug,
		displayName: user.displayName ?? user.username,
		role: roleLabel(user.role as ContributorRole),
		bio: profile.bio,
		isPublic: profile.isPublic,
		isModeratorHidden: profile.isModeratorHidden,
		showInCredits: user.showInCredits,
		avatarUrl: profileAvatar(user.avatarUrl),
		version: profile.version,
		updatedAt: profile.updatedAt,
		socialLinks: sortSocialLinks(links).map((link) => ({
			id: link.id,
			kind: link.kind as SocialKind,
			label: link.label,
			url: link.url,
			isPublic: link.isPublic,
			createdAt: link.createdAt,
			updatedAt: link.updatedAt
		}))
	};
}
function toPublic(
	profile: typeof contributorProfilesTable.$inferSelect,
	user: typeof adminUsersTable.$inferSelect,
	links: (typeof contributorSocialLinksTable.$inferSelect)[]
): ContributorPublicProfile {
	return {
		slug: profile.slug,
		displayName: user.displayName ?? user.username,
		role: roleLabel(user.role as ContributorRole),
		bio: profile.bio,
		avatarUrl: profileAvatar(user.avatarUrl),
		socialLinks: sortSocialLinks(links.filter((link) => link.isPublic)).map((link) => ({
			kind: link.kind as SocialKind,
			label: link.label,
			url: link.url
		}))
	};
}
export type QueryDb = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
async function loadProfileById(queryDb: QueryDb, userId: number) {
	const [row] = await queryDb
		.select({ profile: contributorProfilesTable, user: adminUsersTable })
		.from(contributorProfilesTable)
		.innerJoin(adminUsersTable, eq(adminUsersTable.id, contributorProfilesTable.userId))
		.where(eq(contributorProfilesTable.userId, userId))
		.limit(1);
	if (!row) return null;
	const links = await queryDb
		.select()
		.from(contributorSocialLinksTable)
		.where(eq(contributorSocialLinksTable.profileId, row.profile.id))
		.orderBy(asc(contributorSocialLinksTable.createdAt));
	return { ...row, links };
}
/** Return owner fields and all links, including private links. */
export async function getContributorProfileForOwner(
	userId: number
): Promise<ContributorEditableProfile | null> {
	const loaded = await loadProfileById(db, userId);
	if (!loaded || !loaded.user.isActive || loaded.user.deletedAt) return null;
	return toEditable(loaded.profile, loaded.user, loaded.links);
}
/** Return public profile, collapsing private, missing, inactive, deleted, and hidden states to null. */
export async function getPublicContributorProfile(
	slug: string
): Promise<ContributorPublicProfile | null> {
	const [row] = await db
		.select({ profile: contributorProfilesTable, user: adminUsersTable })
		.from(contributorProfilesTable)
		.innerJoin(adminUsersTable, eq(adminUsersTable.id, contributorProfilesTable.userId))
		.where(
			and(
				eq(contributorProfilesTable.slug, slug),
				eq(contributorProfilesTable.isPublic, true),
				eq(contributorProfilesTable.isModeratorHidden, false),
				eq(adminUsersTable.isActive, true),
				isNull(adminUsersTable.deletedAt)
			)
		)
		.limit(1);
	if (!row) return null;
	const links = await db
		.select()
		.from(contributorSocialLinksTable)
		.where(eq(contributorSocialLinksTable.profileId, row.profile.id))
		.orderBy(asc(contributorSocialLinksTable.createdAt));
	return toPublic(row.profile, row.user, links);
}
/** Read a profile by its database identifier for authorized moderation screens. */
export async function getContributorProfileForAdmin(
	profileId: number
): Promise<ContributorEditableProfile | null> {
	const [row] = await db
		.select({ profile: contributorProfilesTable, user: adminUsersTable })
		.from(contributorProfilesTable)
		.innerJoin(adminUsersTable, eq(adminUsersTable.id, contributorProfilesTable.userId))
		.where(eq(contributorProfilesTable.id, profileId))
		.limit(1);
	if (!row) return null;
	const links = await db
		.select()
		.from(contributorSocialLinksTable)
		.where(eq(contributorSocialLinksTable.profileId, profileId))
		.orderBy(asc(contributorSocialLinksTable.createdAt));
	return toEditable(row.profile, row.user, links);
}
/** Read profile state by account ID for the admin user roster. */
export async function getContributorProfileForAdminByUserId(
	userId: number
): Promise<ContributorEditableProfile | null> {
	const loaded = await loadProfileById(db, userId);
	return loaded ? toEditable(loaded.profile, loaded.user, loaded.links) : null;
}

/** Alias useful to admin callers that identify accounts by admin_users.id. */
export const getContributorProfileByUserId = getContributorProfileForOwner;
function snapshot(
	profile: typeof contributorProfilesTable.$inferSelect,
	user: typeof adminUsersTable.$inferSelect,
	links: (typeof contributorSocialLinksTable.$inferSelect)[],
	reason?: string
): ContributorProfileSnapshot {
	const base = {
		slug: profile.slug,
		displayName: user.displayName ?? user.username,
		role: roleLabel(user.role as ContributorRole),
		bio: profile.bio,
		isPublic: profile.isPublic,
		isModeratorHidden: profile.isModeratorHidden,
		showInCredits: user.showInCredits,
		avatarUrl: profileAvatar(user.avatarUrl),
		socialLinks: sortSocialLinks(links).map((link) => ({
			kind: link.kind as SocialKind,
			label: link.label,
			url: link.url,
			isPublic: link.isPublic
		}))
	};
	return reason ? { ...base, moderationReason: reason } : base;
}
function sanitizedSnapshot(value: unknown): ContributorProfileSnapshot | null {
	if (!isRecord(value)) return null;
	const links = Array.isArray(value.socialLinks)
		? value.socialLinks.filter(isRecord).flatMap((link) =>
				typeof link.kind === 'string' &&
				link.kind in SOCIAL_KIND_METADATA &&
				typeof link.url === 'string' &&
				typeof link.isPublic === 'boolean'
					? [
							{
								kind: link.kind as SocialKind,
								label: typeof link.label === 'string' ? link.label : null,
								url: link.url,
								isPublic: link.isPublic
							}
						]
					: []
			)
		: [];
	if (
		typeof value.slug !== 'string' ||
		typeof value.displayName !== 'string' ||
		typeof value.role !== 'string' ||
		typeof value.bio !== 'string' ||
		typeof value.isPublic !== 'boolean' ||
		typeof value.isModeratorHidden !== 'boolean' ||
		typeof value.showInCredits !== 'boolean'
	)
		return null;
	return {
		slug: value.slug,
		displayName: value.displayName,
		role: value.role as ContributorRoleLabel,
		bio: value.bio,
		isPublic: value.isPublic,
		isModeratorHidden: value.isModeratorHidden,
		showInCredits: value.showInCredits,
		avatarUrl: typeof value.avatarUrl === 'string' ? profileAvatar(value.avatarUrl) : null,
		moderationReason:
			typeof value.moderationReason === 'string' ? value.moderationReason.slice(0, 500) : undefined,
		socialLinks: links
	};
}
/** Strip unknown fields from persisted audit JSON before returning it. */
export const sanitizeContributorProfileSnapshot = sanitizedSnapshot;
async function assertAdmin(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	actorUserId: number
): Promise<void> {
	const [actor] = await tx
		.select({
			role: adminUsersTable.role,
			isActive: adminUsersTable.isActive,
			deletedAt: adminUsersTable.deletedAt
		})
		.from(adminUsersTable)
		.where(eq(adminUsersTable.id, actorUserId))
		.limit(1);
	if (!actor || !actor.isActive || actor.deletedAt || actor.role !== 'admin')
		throw new ContributorProfileForbiddenError();
}
async function appendAudit(
	tx: QueryDb,
	profileId: number,
	actorUserId: number | null,
	action: 'create' | 'update' | 'publish' | 'hide' | 'restore' | 'remove_link',
	fromVersion: number | null,
	toVersion: number,
	before: ContributorProfileSnapshot | null,
	after: ContributorProfileSnapshot
): Promise<void> {
	await tx
		.insert(contributorProfileAuditsTable)
		.values({ profileId, actorUserId, action, fromVersion, toVersion, before, after });
}

/** Create the account-backed profile required for accounts created after migration. */
export async function ensureContributorProfileForAccount(
	tx: QueryDb,
	userId: number,
	username: string,
	actorUserId: number | null = userId
): Promise<void> {
	const [existing] = await tx
		.select({ id: contributorProfilesTable.id })
		.from(contributorProfilesTable)
		.where(eq(contributorProfilesTable.userId, userId))
		.limit(1);
	if (existing) return;

	let base: string;
	try {
		base = normalizeContributorSlug(username);
	} catch {
		base = 'contributor';
	}
	let slug = base;
	let suffixAttempt = 0;
	while (true) {
		const [slugRow] = await tx
			.select({ id: contributorProfilesTable.id })
			.from(contributorProfilesTable)
			.where(eq(contributorProfilesTable.slug, slug))
			.limit(1);
		if (!slugRow) break;
		suffixAttempt += 1;
		const suffix = `-${userId.toString(36)}${suffixAttempt > 1 ? `-${suffixAttempt}` : ''}`;
		slug = `${base.slice(0, 120 - suffix.length)}${suffix}`;
	}

	const [created] = await tx
		.insert(contributorProfilesTable)
		.values({ userId, slug, bio: '', isPublic: true, isModeratorHidden: false, version: 1 })
		.returning();
	const [user] = await tx
		.select()
		.from(adminUsersTable)
		.where(eq(adminUsersTable.id, userId))
		.limit(1);
	if (!created || !user)
		throw new ContributorProfileError('Could not create contributor profile.', 500);
	await appendAudit(
		tx,
		created.id,
		actorUserId,
		'create',
		null,
		created.version,
		null,
		snapshot(created, user, [])
	);
}
/** Replace complete owner state with optimistic version protection. */
export async function replaceContributorProfile(
	userId: number,
	input: unknown
): Promise<ContributorEditableProfile> {
	const update = parseContributorProfileUpdate(input, { requireMessagingDisclosure: false });
	return db.transaction(async (tx) => {
		const loaded = await loadProfileById(tx, userId);
		if (!loaded || !loaded.user.isActive || loaded.user.deletedAt)
			throw new ContributorProfileNotFoundError();
		if (loaded.profile.version !== update.version)
			throw new ContributorProfileConflictError(
				toEditable(loaded.profile, loaded.user, loaded.links)
			);
		const hadPublicMessaging = hasPublicMessagingLink(
			loaded.links.map(({ kind, label, url, isPublic }) => ({
				kind: kind as SocialKind,
				label,
				url,
				isPublic
			}))
		);
		if (
			update.isPublic &&
			hasPublicMessagingLink(update.socialLinks) &&
			(!loaded.profile.isPublic || !hadPublicMessaging) &&
			!update.messagingDisclosureAcknowledged
		) {
			throw new ContributorProfileError('Messaging links require explicit disclosure.');
		}
		const before = snapshot(loaded.profile, loaded.user, loaded.links);
		const [updated] = await tx
			.update(contributorProfilesTable)
			.set({
				bio: update.bio,
				isPublic: update.isPublic,
				version: sql`${contributorProfilesTable.version} + 1`,
				updatedAt: sql`now()`
			})
			.where(
				and(
					eq(contributorProfilesTable.id, loaded.profile.id),
					eq(contributorProfilesTable.version, update.version)
				)
			)
			.returning();
		if (!updated) {
			const current = await loadProfileById(tx, userId);
			if (!current) throw new ContributorProfileNotFoundError();
			throw new ContributorProfileConflictError(
				toEditable(current.profile, current.user, current.links)
			);
		}
		await tx
			.delete(contributorSocialLinksTable)
			.where(eq(contributorSocialLinksTable.profileId, loaded.profile.id));
		if (update.socialLinks.length)
			await tx.insert(contributorSocialLinksTable).values(
				update.socialLinks.map((link) => ({
					profileId: loaded.profile.id,
					kind: link.kind,
					label: link.label,
					url: link.url,
					isPublic: link.isPublic
				}))
			);
		await tx
			.update(adminUsersTable)
			.set({ showInCredits: update.showInCredits })
			.where(eq(adminUsersTable.id, userId));
		const final = await loadProfileById(tx, userId);
		if (!final) throw new ContributorProfileNotFoundError();
		await appendAudit(
			tx,
			final.profile.id,
			userId,
			update.isPublic !== loaded.profile.isPublic ? 'publish' : 'update',
			loaded.profile.version,
			final.profile.version,
			before,
			snapshot(final.profile, final.user, final.links)
		);
		return toEditable(final.profile, final.user, final.links);
	});
}
async function moderateProfile(
	profileId: number,
	actorUserId: number,
	action: 'hide' | 'restore',
	reason?: string
): Promise<ContributorEditableProfile> {
	const safeReason = action === 'hide' ? moderationReason(reason) : undefined;
	return db.transaction(async (tx) => {
		await assertAdmin(tx, actorUserId);
		const [row] = await tx
			.select({ profile: contributorProfilesTable, user: adminUsersTable })
			.from(contributorProfilesTable)
			.innerJoin(adminUsersTable, eq(adminUsersTable.id, contributorProfilesTable.userId))
			.where(eq(contributorProfilesTable.id, profileId))
			.limit(1);
		if (!row) throw new ContributorProfileNotFoundError();
		const links = await tx
			.select()
			.from(contributorSocialLinksTable)
			.where(eq(contributorSocialLinksTable.profileId, profileId));
		const before = snapshot(row.profile, row.user, links);
		const [updated] = await tx
			.update(contributorProfilesTable)
			.set({
				isModeratorHidden: action === 'hide',
				version: sql`${contributorProfilesTable.version} + 1`,
				updatedAt: sql`now()`
			})
			.where(eq(contributorProfilesTable.id, profileId))
			.returning();
		if (!updated) throw new ContributorProfileNotFoundError();
		await appendAudit(
			tx,
			profileId,
			actorUserId,
			action,
			row.profile.version,
			updated.version,
			before,
			snapshot(updated, row.user, links, safeReason)
		);
		return toEditable(updated, row.user, links);
	});
}
export function hideContributorProfile(
	profileId: number,
	actorUserId: number,
	reason: string
): Promise<ContributorEditableProfile> {
	return moderateProfile(profileId, actorUserId, 'hide', reason);
}
export function restoreContributorProfile(
	profileId: number,
	actorUserId: number
): Promise<ContributorEditableProfile> {
	return moderateProfile(profileId, actorUserId, 'restore');
}
/** Remove one unsafe social link while retaining the audit trail. */
export async function removeContributorSocialLink(
	profileId: number,
	linkId: number,
	actorUserId: number,
	reason: string
): Promise<ContributorEditableProfile> {
	const safeReason = moderationReason(reason);
	return db.transaction(async (tx) => {
		await assertAdmin(tx, actorUserId);
		const [row] = await tx
			.select({ profile: contributorProfilesTable, user: adminUsersTable })
			.from(contributorProfilesTable)
			.innerJoin(adminUsersTable, eq(adminUsersTable.id, contributorProfilesTable.userId))
			.where(eq(contributorProfilesTable.id, profileId))
			.limit(1);
		if (!row) throw new ContributorProfileNotFoundError();
		const links = await tx
			.select()
			.from(contributorSocialLinksTable)
			.where(eq(contributorSocialLinksTable.profileId, profileId));
		if (!links.some((link) => link.id === linkId))
			throw new ContributorProfileNotFoundError('Social link not found.');
		const before = snapshot(row.profile, row.user, links);
		await tx
			.delete(contributorSocialLinksTable)
			.where(
				and(
					eq(contributorSocialLinksTable.id, linkId),
					eq(contributorSocialLinksTable.profileId, profileId)
				)
			);
		const [updated] = await tx
			.update(contributorProfilesTable)
			.set({ version: sql`${contributorProfilesTable.version} + 1`, updatedAt: sql`now()` })
			.where(eq(contributorProfilesTable.id, profileId))
			.returning();
		if (!updated) throw new ContributorProfileNotFoundError();
		await appendAudit(
			tx,
			profileId,
			actorUserId,
			'remove_link',
			row.profile.version,
			updated.version,
			before,
			snapshot(
				updated,
				row.user,
				links.filter((link) => link.id !== linkId),
				safeReason
			)
		);
		return toEditable(
			updated,
			row.user,
			links.filter((link) => link.id !== linkId)
		);
	});
}
/** Clear only admin_users.avatar_url. Object deletion is intentionally not attempted. */
export async function removeContributorAvatarReference(
	profileId: number,
	actorUserId: number,
	reason: string
): Promise<ContributorEditableProfile> {
	const safeReason = moderationReason(reason);
	return db.transaction(async (tx) => {
		await assertAdmin(tx, actorUserId);
		const [row] = await tx
			.select({ profile: contributorProfilesTable, user: adminUsersTable })
			.from(contributorProfilesTable)
			.innerJoin(adminUsersTable, eq(adminUsersTable.id, contributorProfilesTable.userId))
			.where(eq(contributorProfilesTable.id, profileId))
			.limit(1);
		if (!row) throw new ContributorProfileNotFoundError();
		const links = await tx
			.select()
			.from(contributorSocialLinksTable)
			.where(eq(contributorSocialLinksTable.profileId, profileId));
		const before = snapshot(row.profile, row.user, links);
		await tx
			.update(adminUsersTable)
			.set({ avatarUrl: null, updatedAt: sql`now()` })
			.where(eq(adminUsersTable.id, row.user.id));
		const [updated] = await tx
			.update(contributorProfilesTable)
			.set({ version: sql`${contributorProfilesTable.version} + 1`, updatedAt: sql`now()` })
			.where(eq(contributorProfilesTable.id, profileId))
			.returning();
		if (!updated) throw new ContributorProfileNotFoundError();
		const afterUser = { ...row.user, avatarUrl: null };
		await appendAudit(
			tx,
			profileId,
			actorUserId,
			'update',
			row.profile.version,
			updated.version,
			before,
			snapshot(updated, afterUser, links, safeReason)
		);
		return toEditable(updated, afterUser, links);
	});
}
export async function listContributorProfileAudits(
	profileId: number,
	options: { limit?: number; offset?: number } = {}
): Promise<{ rows: ContributorProfileAudit[]; limit: number; offset: number }> {
	const [profile] = await db
		.select({ id: contributorProfilesTable.id })
		.from(contributorProfilesTable)
		.where(eq(contributorProfilesTable.id, profileId))
		.limit(1);
	if (!profile) throw new ContributorProfileNotFoundError();
	const limit = Math.min(Math.max(Math.trunc(options.limit ?? AUDIT_PAGE_SIZE), 1), 100);
	const offset = Math.max(Math.trunc(options.offset ?? 0), 0);
	const rows = await db
		.select({ audit: contributorProfileAuditsTable, actor: adminUsersTable })
		.from(contributorProfileAuditsTable)
		.leftJoin(adminUsersTable, eq(adminUsersTable.id, contributorProfileAuditsTable.actorUserId))
		.where(eq(contributorProfileAuditsTable.profileId, profileId))
		.orderBy(desc(contributorProfileAuditsTable.createdAt), desc(contributorProfileAuditsTable.id))
		.limit(limit)
		.offset(offset);
	return {
		limit,
		offset,
		rows: rows.map(({ audit, actor }) => ({
			id: audit.id,
			profileId: audit.profileId,
			actorUserId: audit.actorUserId,
			actorDisplayName: actor ? (actor.displayName ?? actor.username) : null,
			actorRole: actor ? roleLabel(actor.role as ContributorRole) : null,
			action: audit.action,
			fromVersion: audit.fromVersion,
			toVersion: audit.toVersion,
			before: sanitizedSnapshot(audit.before),
			after: sanitizedSnapshot(audit.after) ?? {
				slug: '',
				displayName: '',
				role: 'Contributor',
				bio: '',
				isPublic: false,
				isModeratorHidden: false,
				showInCredits: false,
				avatarUrl: null,
				socialLinks: []
			},
			createdAt: audit.createdAt
		}))
	};
}
/** Resolve internal profile, then safe legacy URL, then plain text attribution. */
export async function resolveContributorAttribution(
	userId: number
): Promise<ContributorAttribution | null> {
	const [row] = await db
		.select({ profile: contributorProfilesTable, user: adminUsersTable })
		.from(adminUsersTable)
		.leftJoin(contributorProfilesTable, eq(contributorProfilesTable.userId, adminUsersTable.id))
		.where(eq(adminUsersTable.id, userId))
		.limit(1);
	if (!row) return null;
	const name = row.user.displayName ?? row.user.username;
	if (!row.user.showInCredits) return { name, avatarUrl: null, href: null };
	const managedAvatarUrl = profileAvatar(row.user.avatarUrl);
	if (
		row.profile &&
		row.profile.isPublic &&
		!row.profile.isModeratorHidden &&
		row.user.isActive &&
		row.user.deletedAt === null
	) {
		return { name, avatarUrl: managedAvatarUrl, href: `/contributor/${row.profile.slug}` };
	}
	let href: string | null = null;
	if (row.user.profileUrl) href = legacyProfileUrl(row.user.profileUrl);
	return { name, avatarUrl: null, href };
}
export {
	normalizeHttpsUrl,
	sortSocialLinks,
	validateSocialLinkMultiplicity,
	hasPublicMessagingLink
};
