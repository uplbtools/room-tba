import { eq } from 'drizzle-orm';
import { adminUsersTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import type { PhotoAttribution } from '#lib/utils/entity/entity-photos.js';

function validatedProfileUrl(value: string | null): string | null {
	const trimmed = value?.trim() ?? '';
	if (!trimmed) return null;
	try {
		if (new URL(trimmed).protocol !== 'https:') return null;
	} catch {
		return null;
	}
	return trimmed;
}

export async function resolvePhotoAttribution(
	userId: number | null,
	fallbackName: string
): Promise<PhotoAttribution> {
	const name = fallbackName.trim();
	if (userId === null) return { name, profileUrl: null };

	const [account] = await db
		.select({
			profileUrl: adminUsersTable.profileUrl,
			showInCredits: adminUsersTable.showInCredits
		})
		.from(adminUsersTable)
		.where(eq(adminUsersTable.id, userId))
		.limit(1);

	if (!account?.showInCredits) return { name, profileUrl: null };
	return {
		name,
		profileUrl: validatedProfileUrl(account.profileUrl)
	};
}
