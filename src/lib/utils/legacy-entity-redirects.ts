import type { Handle } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { MAP_BASE_PATH } from '#lib/utils/entity/entity-urls.js';

// Astro served entity pages at the site root. They now live under the map, so
// the old links — shared, bookmarked, and indexed — need to keep resolving.
const LEGACY_SEGMENTS: Record<string, string> = {
	building: 'buildings',
	college: 'colleges',
	division: 'divisions',
	room: 'rooms',
	dorm: 'dorms',
	organization: 'organizations',
	unit: 'units',
	landmark: 'landmarks',
	establishment: 'establishments',
	event: 'events',
	transit: 'transit'
};

const LEGACY_PATH_PATTERN = new RegExp(`^/(${Object.keys(LEGACY_SEGMENTS).join('|')})(/.*)?$`);

export function resolveLegacyEntityPath(pathname: string): string | null {
	const match = pathname.match(LEGACY_PATH_PATTERN);
	if (!match) return null;
	return `${MAP_BASE_PATH}/${LEGACY_SEGMENTS[match[1]]}${match[2] ?? '/'}`;
}

export const legacyEntityRedirects: Handle = async ({ event, resolve }) => {
	const target = resolveLegacyEntityPath(event.url.pathname);
	if (target) {
		// 308: these are permanent moves, and the method must survive for the few
		// links that arrive as anything other than GET.
		redirect(308, `${target}${event.url.search}`);
	}
	return resolve(event);
};
