import { getAllJeepneyRoutes } from '#lib/services/transit.js';
import { getAllPlaces } from '#lib/services/entity/map-data.js';
import {
	resolveRouteGeometry,
	ROUTE_PRINT_NOTES,
	type StoredRouteGeometry
} from '#lib/constants/map/jeepney-routes.js';
import jeepneyGeometries from '#lib/constants/map/jeepney-geometries.json';
import transitBasemap from '#lib/constants/map/transit-basemap.json';
import { perBoardingFare } from '#lib/utils/transit/transit-route-kind.js';
import {
	parseHerePoint,
	renderTransitMapPdf,
	TRANSIT_MAP_PALETTES,
	type TransitMapPalette,
	type TransitBasemap,
	type TransitMapHere,
	type TransitMapFormat
} from '#lib/utils/transit/transit-map-pdf.js';
import type { RequestHandler } from './$types';

const storedGeometries = jeepneyGeometries as Record<string, StoredRouteGeometry | undefined>;

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

/** Printable transit map PDF, with `here`, `format=a4|letter|a3`, `layout=poster` and `palette`. */
export const GET: RequestHandler = async ({ url }) => {
	const hereParam = url.searchParams.get('here')?.trim();
	const formatParam = url.searchParams.get('format')?.trim();
	const paletteParam = url.searchParams.get('palette')?.trim() ?? '';
	const palette =
		paletteParam in TRANSIT_MAP_PALETTES ? (paletteParam as TransitMapPalette) : undefined;
	const format: TransitMapFormat =
		formatParam === 'letter' || formatParam === 'a3' ? formatParam : 'a4';
	const layout = url.searchParams.get('layout') === 'poster' ? 'poster' : 'sheet';

	const point = parseHerePoint(url.searchParams);
	if (point === 'invalid') {
		return json({ error: 'lat and lon must be valid coordinates.' }, 400);
	}
	let here: TransitMapHere | null = point;
	if (!here && hereParam) {
		const asId = Number(hereParam);
		const places = await getAllPlaces().catch(() => []);
		const bare = (name: string) =>
			name
				.replace(/\s*\([^)]*\)\s*$/, '')
				.trim()
				.toLowerCase();
		const query = hereParam.toLowerCase();
		const match =
			Number.isInteger(asId) && asId > 0
				? places.find((p) => p.id === asId)
				: places.find(
						(p) =>
							p.name.trim().toLowerCase() === query ||
							bare(p.name) === query ||
							bare(p.name) === bare(hereParam)
					);
		if (!match || match.lat == null || match.lon == null) {
			return json(
				{
					error: `No mappable place found for "${hereParam}". Open the place in the app and use its Printable map action, or pass its exact name or id.`
				},
				404
			);
		}
		here = { name: match.name, lat: match.lat, lon: match.lon };
	}

	try {
		const routes = (await getAllJeepneyRoutes()).map((route) => {
			const geometry = resolveRouteGeometry(route, storedGeometries);
			return {
				id: route.id,
				name: route.name,
				color: route.color,
				fareRegular: perBoardingFare(route)?.regular ?? Number.NaN,
				fareDiscounted: perBoardingFare(route)?.discounted ?? Number.NaN,
				directionNote: route.directionNote ?? null,
				boardingNote: ROUTE_PRINT_NOTES[route.id] ?? null,
				line:
					geometry.source !== 'stops-only' && geometry.line
						? geometry.line.coordinates.map(([lon, lat]) => ({
								lat: lat as number,
								lon: lon as number
							}))
						: undefined,
				stops: route.stops.map((stop) => ({
					name: stop.name,
					lat: stop.lat,
					lon: stop.lon
				}))
			};
		});
		const bytes = await renderTransitMapPdf({
			routes,
			here,
			basemap: transitBasemap as TransitBasemap,
			format,
			layout,
			palette
		});
		const nameSlug = (here?.name ?? '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
		const slug = here ? `-from-${nameSlug || 'here'}` : '';
		return new Response(Buffer.from(bytes), {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `inline; filename="uplb-transit-map${slug}.pdf"`,
				'Cache-Control': 'no-store'
			}
		});
	} catch (error) {
		console.error('transit-map PDF failed:', error);
		return json({ error: "Couldn't render the transit map PDF." }, 500);
	}
};
