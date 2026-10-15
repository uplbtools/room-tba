import { parseImageUrl } from '../r2-upload-core';

export const MAX_ENTITY_PHOTOS = 10;

export type EntityPhoto = {
	url: string;
	attributionName: string | null;
	attributionProfileUrl: string | null;
};

export type PhotoAttribution = {
	name: string;
	profileUrl: string | null;
};

export type ParsedEntityPhotoUrls =
	| { ok: true; provided: boolean; photoUrls: string[] }
	| { ok: false; error: string };

export function parseEntityPhotoUrls(
	value: unknown,
	publicBaseUrl?: string | null
): ParsedEntityPhotoUrls {
	if (value === undefined) {
		return { ok: true, provided: false, photoUrls: [] };
	}
	if (!Array.isArray(value)) {
		return { ok: false, error: 'Photo URLs must be an array' };
	}
	if (value.length > MAX_ENTITY_PHOTOS) {
		return {
			ok: false,
			error: `A maximum of ${MAX_ENTITY_PHOTOS} photos is allowed`
		};
	}

	const photoUrls: string[] = [];
	const seen = new Set<string>();
	for (const [index, valueAtIndex] of value.entries()) {
		if (typeof valueAtIndex !== 'string') {
			return {
				ok: false,
				error: `Photo URL at index ${index} must be a string`
			};
		}

		const parsed = parseImageUrl(valueAtIndex, publicBaseUrl, 'Photo');
		if (!parsed.ok) return parsed;
		if (!parsed.imageUrl) {
			return {
				ok: false,
				error: `Photo URL at index ${index} must be a non-empty HTTPS URL`
			};
		}
		if (seen.has(parsed.imageUrl)) {
			return { ok: false, error: 'Photo URLs must be unique' };
		}

		seen.add(parsed.imageUrl);
		photoUrls.push(parsed.imageUrl);
	}

	return { ok: true, provided: true, photoUrls };
}

export function reconcileEntityPhotos(
	existing: EntityPhoto[],
	requestedUrls: string[],
	attribution: PhotoAttribution
): EntityPhoto[] {
	const existingByUrl = new Map(existing.map((photo) => [photo.url, photo]));
	const attributionName = attribution.name.trim();
	const attributionProfileUrl = attribution.profileUrl?.trim() || null;

	return requestedUrls.map((url) => {
		const retained = existingByUrl.get(url);
		if (retained) return retained;
		return {
			url,
			attributionName,
			attributionProfileUrl
		};
	});
}

/** Returns stored photo URLs from either normalized entities or URL arrays. */
export function entityPhotoUrls(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		if (typeof item === 'string') return item;
		if (!item || typeof item !== 'object' || !('url' in item)) return [];
		const url = item.url;
		return typeof url === 'string' ? url : [];
	});
}

/** Normalizes JSONB/API photo collections while preserving optional credits. */
export function normalizeEntityPhotos(value: unknown): EntityPhoto[] {
	let candidate = value;
	if (typeof candidate === 'string') {
		try {
			candidate = JSON.parse(candidate);
		} catch {
			return [];
		}
	}
	if (!Array.isArray(candidate)) return [];

	const seen = new Set<string>();
	const normalized: EntityPhoto[] = [];
	for (const item of candidate) {
		let url: string;
		let attributionName: string | null = null;
		let attributionProfileUrl: string | null = null;

		if (typeof item === 'string') {
			url = item.trim();
		} else if (item && typeof item === 'object' && 'url' in item && typeof item.url === 'string') {
			url = item.url.trim();
			attributionName =
				'attributionName' in item &&
				typeof item.attributionName === 'string' &&
				item.attributionName.trim()
					? item.attributionName.trim()
					: null;
			attributionProfileUrl =
				'attributionProfileUrl' in item &&
				typeof item.attributionProfileUrl === 'string' &&
				item.attributionProfileUrl.trim()
					? item.attributionProfileUrl.trim()
					: null;
		} else {
			continue;
		}

		if (!url || seen.has(url)) continue;
		seen.add(url);
		normalized.push({ url, attributionName, attributionProfileUrl });
		if (normalized.length === MAX_ENTITY_PHOTOS) break;
	}
	return normalized;
}
