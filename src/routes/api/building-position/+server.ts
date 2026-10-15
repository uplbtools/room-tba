import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { canPublishDirectly } from '#lib/admin/auth.js';
import { getEditorSession } from '#lib/admin/require-editor.js';
import { CAMPUS_BOUNDS } from '#lib/constants/map/terrain.js';
import { db } from '#lib/utils/db.js';
import { buildingsTable } from '#lib/server/db/schema.js';
import { refreshSyncKey } from '#lib/services/admin/actions.js';
import type { RequestHandler } from './$types';

function jsonError(status: number, error: string): Response {
	return new Response(JSON.stringify({ error }), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

function jsonOk<T>(data: T, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

function canPublish(cookies: Cookies): boolean {
	const session = getEditorSession(cookies);
	return session !== null && canPublishDirectly(session.role);
}

export const PUT: RequestHandler = async ({ request, cookies, url }) => {
	if (!canPublish(cookies)) return jsonError(401, 'Not authorized');

	const buildingName = url.searchParams.get('building');
	if (!buildingName) {
		return jsonError(400, 'Missing required ?building= query param');
	}

	let body: { lon?: number; lat?: number };
	try {
		body = await request.json();
	} catch {
		return jsonError(400, 'Invalid JSON body');
	}

	const { lon, lat } = body;
	if (
		typeof lon !== 'number' ||
		typeof lat !== 'number' ||
		!Number.isFinite(lon) ||
		!Number.isFinite(lat)
	) {
		return jsonError(400, 'Body must contain { lon: number, lat: number }');
	}

	// Validate coordinates are within campus bounds (with a small margin).
	const margin = 0.01;
	const minLng = CAMPUS_BOUNDS.minLng - margin;
	const maxLng = CAMPUS_BOUNDS.maxLng + margin;
	const minLat = CAMPUS_BOUNDS.minLat - margin;
	const maxLat = CAMPUS_BOUNDS.maxLat + margin;

	if (lon < minLng || lon > maxLng || lat < minLat || lat > maxLat) {
		return jsonError(400, 'Coordinates are outside campus bounds');
	}

	try {
		await db
			.update(buildingsTable)
			.set({ lon, lat })
			.where(eq(buildingsTable.buildingName, buildingName));
		await refreshSyncKey('buildings');

		return jsonOk({ success: true, lon, lat });
	} catch (_error) {
		return jsonError(500, 'Failed to update building position');
	}
};
