import { JEEPNEY_ROUTES, type JeepneyRoute } from '#lib/constants/map/jeepney-routes.js';
import { slugifySegment } from './site';

// Transit pages render inside the map, like every other entity route.
export const TRANSIT_INDEX_PATH = '/map/transit/';

export type TransitPath = {
	routeId: string | null;
	stopSlug: string | null;
};

export function getTransitRoutePath(routeId: string) {
	return `/map/transit/${encodeURIComponent(routeId)}/`;
}

export function getTransitStopSlug(route: JeepneyRoute, stopIndex: number) {
	const stop = route.stops[stopIndex];
	if (!stop) return null;

	// The common campus shorthand is more recognizable than the full stop name.
	const base =
		route.id === 'kaliwa-kanan' && stop.name === 'Carabao Park / DevCom'
			? 'cpark-devcom'
			: slugifySegment(stop.name);
	const duplicate = route.stops
		.slice(0, stopIndex)
		.filter((entry) => slugifySegment(entry.name) === slugifySegment(stop.name)).length;
	return duplicate === 0 ? base : `${base}-${duplicate + 1}`;
}

export function getTransitStopPath(
	routeId: string,
	stopIndex: number,
	route = JEEPNEY_ROUTES.find((entry) => entry.id === routeId)
) {
	const stopSlug = route ? getTransitStopSlug(route, stopIndex) : null;
	return stopSlug
		? `${getTransitRoutePath(routeId)}${encodeURIComponent(stopSlug)}/`
		: getTransitRoutePath(routeId);
}

export function getTransitStopIndex(route: JeepneyRoute, stopSlug: string) {
	return route.stops.findIndex((_, index) => getTransitStopSlug(route, index) === stopSlug);
}

export function parseTransitPathname(pathname: string): TransitPath | null {
	const match = pathname.match(/^\/map\/transit(?:\/([^/]+)(?:\/([^/]+))?)?\/?$/);
	if (!match) return null;
	return {
		routeId: match[1] ? decodeURIComponent(match[1]) : null,
		stopSlug: match[2] ? decodeURIComponent(match[2]) : null
	};
}
