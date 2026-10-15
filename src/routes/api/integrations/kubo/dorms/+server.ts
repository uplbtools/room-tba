import { json } from '@sveltejs/kit';
import { KUBO_ROOM_TBA_DIRECTORY_URL } from '$app/env/private';
import type { RequestHandler } from './$types';

const CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600';

// Inlined from astro/src/lib/server/kubo-dorm-directory.ts
const DEFAULT_KUBO_DIRECTORY_URL = 'https://kubo.community/api/public/integrations/room-tba/dorms';

// Inlined from astro/src/lib/kubo-dorms.ts
const KUBO_RESERVATION_STATUSES = [
	'accepting',
	'waitlist',
	'paused',
	'unavailable',
	'unknown'
] as const;

type KuboReservationStatus = (typeof KUBO_RESERVATION_STATUSES)[number];

type KuboDormRecord = {
	roomTbaDormId: number;
	name: string;
	kuboSlug: string;
	listingUrl: string;
	reservationStatus: KuboReservationStatus;
	reservationUrl: string | null;
	updatedAt: string;
};

type KuboDormDirectoryResponse = {
	version: 1;
	generatedAt: string;
	dorms: KuboDormRecord[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isIsoDate(value: unknown): value is string {
	return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isSafeKuboUrl(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	try {
		const url = new URL(value);

		return (
			url.protocol === 'https:' &&
			(url.hostname === 'kubo.community' || url.hostname.endsWith('.kubo.community'))
		);
	} catch {
		return false;
	}
}

function isKuboDormRecord(value: unknown): value is KuboDormRecord {
	if (!isRecord(value)) return false;

	return (
		Number.isInteger(value.roomTbaDormId) &&
		Number(value.roomTbaDormId) > 0 &&
		typeof value.name === 'string' &&
		value.name.length > 0 &&
		typeof value.kuboSlug === 'string' &&
		value.kuboSlug.length > 0 &&
		isSafeKuboUrl(value.listingUrl) &&
		KUBO_RESERVATION_STATUSES.includes(value.reservationStatus as KuboReservationStatus) &&
		(value.reservationUrl === null || isSafeKuboUrl(value.reservationUrl)) &&
		isIsoDate(value.updatedAt)
	);
}

function parseKuboDormDirectory(value: unknown): KuboDormDirectoryResponse | null {
	if (!isRecord(value) || value.version !== 1) return null;
	if (!isIsoDate(value.generatedAt) || !Array.isArray(value.dorms)) return null;

	const dorms: KuboDormRecord[] = [];
	const seenIds = new Set<number>();
	for (const item of value.dorms) {
		if (!isKuboDormRecord(item) || seenIds.has(item.roomTbaDormId)) return null;
		seenIds.add(item.roomTbaDormId);
		dorms.push(item);
	}

	return { version: 1, generatedAt: value.generatedAt, dorms };
}

async function fetchKuboDormDirectory(upstreamUrl: string): Promise<{
	directory: KuboDormDirectoryResponse;
	etag: string | null;
}> {
	const response = await fetch(upstreamUrl, {
		headers: { Accept: 'application/json', 'User-Agent': 'room-tba' },
		signal: AbortSignal.timeout(2_000)
	});
	if (!response.ok) {
		throw new Error(`Kubo directory returned HTTP ${response.status}`);
	}

	const directory = parseKuboDormDirectory(await response.json());
	if (!directory) throw new Error('Kubo directory returned an invalid payload');

	return { directory, etag: response.headers.get('etag') };
}

export const GET: RequestHandler = async () => {
	try {
		const { directory, etag } = await fetchKuboDormDirectory(
			KUBO_ROOM_TBA_DIRECTORY_URL || DEFAULT_KUBO_DIRECTORY_URL
		);
		const headers: Record<string, string> = { 'Cache-Control': CACHE_CONTROL };

		if (etag) headers.ETag = etag;

		return json(directory, { status: 200, headers });
	} catch (e) {
		console.error(
			'[kubo-directory] Upstream directory unavailable:',
			e instanceof Error ? e.message : 'unknown error'
		);
		return json(
			{ error: 'Kubo directory unavailable' },
			{
				status: 503,
				headers: {
					'Cache-Control': 'no-store'
				}
			}
		);
	}
};
