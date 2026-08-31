import { resolveContributorAttribution } from './contributor-profile';
import type { PhotoAttribution } from '$lib/utils/entity/entity-photos';

export async function resolvePhotoAttribution(
	userId: number | null,
	fallbackName: string
): Promise<PhotoAttribution> {
	const name = fallbackName.trim();
	if (userId === null) return { name, profileUrl: null };

	const attribution = await resolveContributorAttribution(userId);
	return {
		name,
		profileUrl: attribution?.href ?? null
	};
}
