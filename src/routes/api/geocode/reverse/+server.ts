import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// From astro/src/campus.config.ts via astro/src/lib/site.ts
const SITE_NAME = 'Room TBA';
const SITE_URL = 'https://room-tba.uplb.tools';

const REVERSE_GEOCODE_LIMIT = { max: 30, windowMs: 60 * 1000 };

// Inlined from astro/src/lib/api/rate-limit.ts — best-effort in-memory
// limiter (per server instance).
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

type RateLimitResult =
	| { allowed: true; remaining: number; resetAt: number }
	| { allowed: false; remaining: 0; resetAt: number };

function checkRateLimit(
	key: string,
	max: number,
	windowMs: number,
	now = Date.now()
): RateLimitResult {
	const bucket = rateLimitBuckets.get(key);
	if (!bucket || now >= bucket.resetAt) {
		const resetAt = now + windowMs;
		rateLimitBuckets.set(key, { count: 1, resetAt });
		return { allowed: true, remaining: max - 1, resetAt };
	}

	if (bucket.count >= max) {
		return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
	}

	bucket.count += 1;
	return {
		allowed: true,
		remaining: max - bucket.count,
		resetAt: bucket.resetAt
	};
}

function rateLimitResponse(
	resetAt: number,
	message = 'Too many requests. Wait a few minutes and try again.'
) {
	const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
	return json(
		{ error: message },
		{
			status: 429,
			headers: {
				'Retry-After': String(retryAfter)
			}
		}
	);
}

// Inlined from astro/src/lib/reverse-geocode.ts
const reverseGeocodeCache = new Map<string, string | null>();

function reverseGeocodeCacheKey(lat: number, lon: number) {
	return `${lat.toFixed(5)},${lon.toFixed(5)}`;
}

type NominatimAddress = {
	road?: string;
	neighbourhood?: string;
	suburb?: string;
	city?: string;
	county?: string;
	state?: string;
};

type NominatimResult = {
	display_name?: string;
	address?: NominatimAddress;
};

function formatNominatimAddress(result: NominatimResult): string | null {
	const address = result.address;
	if (!address) return result.display_name?.trim() || null;
	const parts = [
		address.road,
		address.neighbourhood || address.suburb,
		address.city || address.county,
		address.state
	].filter((part): part is string => Boolean(part?.trim()));
	if (parts.length) return parts.join(', ');
	return result.display_name?.trim() || null;
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
	const key = reverseGeocodeCacheKey(lat, lon);
	if (reverseGeocodeCache.has(key)) return reverseGeocodeCache.get(key) ?? null;

	const url = new URL('https://nominatim.openstreetmap.org/reverse');
	url.searchParams.set('lat', String(lat));
	url.searchParams.set('lon', String(lon));
	url.searchParams.set('format', 'jsonv2');
	url.searchParams.set('zoom', '18');

	const response = await fetch(url, {
		headers: {
			'User-Agent': `${SITE_NAME}/1.0 (${SITE_URL}; campus map)`,
			Accept: 'application/json'
		}
	});
	if (!response.ok) {
		reverseGeocodeCache.set(key, null);
		return null;
	}

	const data = (await response.json()) as NominatimResult;
	const formatted = formatNominatimAddress(data);
	reverseGeocodeCache.set(key, formatted);
	return formatted;
}

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	const ip = getClientAddress();
	const rate = checkRateLimit(
		`geocode-reverse:${ip}`,
		REVERSE_GEOCODE_LIMIT.max,
		REVERSE_GEOCODE_LIMIT.windowMs
	);
	if (!rate.allowed) {
		return rateLimitResponse(rate.resetAt);
	}

	const lat = Number(url.searchParams.get('lat'));
	const lon = Number(url.searchParams.get('lon'));
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
		return json({ error: 'Enter valid coordinates.' }, { status: 400 });
	}
	if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
		return json({ error: 'Coordinates are out of range.' }, { status: 400 });
	}

	try {
		const address = await reverseGeocode(lat, lon);
		return json({ address });
	} catch (e) {
		console.error('Reverse geocode failed:', e);
		return json({ error: "Couldn't look up the address." }, { status: 502 });
	}
};
