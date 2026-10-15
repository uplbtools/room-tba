import { asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { floraSpeciesTable, floraSpecimensTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

/**
 * Public flora read. `?notable=1` restricts to the notable specimens the phase 1
 * map layer draws. Cached at the edge deliberately (see astro flora.ts).
 * Query inlined from astro map-data-service getAllFloraSpecimens.
 */
export const GET: RequestHandler = async ({ url }) => {
	const notableOnly = url.searchParams.get('notable') === '1';

	try {
		const data = await db
			.select({
				id: floraSpecimensTable.id,
				speciesId: floraSpecimensTable.speciesId,
				lat: floraSpecimensTable.lat,
				lon: floraSpecimensTable.lon,
				tagNumber: floraSpecimensTable.tagNumber,
				plantedYear: floraSpecimensTable.plantedYear,
				notes: floraSpecimensTable.notes,
				isNotable: floraSpecimensTable.isNotable,
				source: floraSpecimensTable.source,
				sourceLicence: floraSpecimensTable.sourceLicence,
				scientificName: floraSpeciesTable.scientificName,
				family: floraSpeciesTable.family,
				commonNames: floraSpeciesTable.commonNames,
				description: floraSpeciesTable.description,
				imageUrl: floraSpeciesTable.imageUrl,
				conservationStatus: floraSpeciesTable.conservationStatus,
				isNative: floraSpeciesTable.isNative
			})
			.from(floraSpecimensTable)
			.innerJoin(floraSpeciesTable, eq(floraSpecimensTable.speciesId, floraSpeciesTable.id))
			.where(notableOnly ? eq(floraSpecimensTable.isNotable, true) : undefined)
			.orderBy(asc(floraSpeciesTable.scientificName), asc(floraSpecimensTable.id));
		return new Response(JSON.stringify(data), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400'
			}
		});
	} catch (e) {
		console.error('flora query failed:', e);
		return new Response(JSON.stringify({ error: 'Flora data is temporarily unavailable.' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
