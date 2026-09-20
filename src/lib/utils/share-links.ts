import {
	getBuildingCanonicalPath,
	getCollegeCanonicalPath,
	getDivisionCanonicalPath,
	getDormCanonicalPath,
	getEventCanonicalPath,
	getOrganizationCanonicalPath,
	getPlaceCanonicalPath,
	getRoomCanonicalPath
} from './entity/entity-urls';
import { withTermQuery } from './term/term-url';
import { absoluteUrl } from './site';
import { getTransitRoutePath, getTransitStopPath } from './transit-urls';
import type { DormData, OrgData, PlaceData, Room } from './types';
import type { JeepneyRoute } from '$lib/constants/map/jeepney-routes';

export function getBuildingShareUrl(
	buildingName: string,
	termId?: number | null,
	defaultTermId?: number | null
) {
	return absoluteUrl(withTermQuery(getBuildingCanonicalPath(buildingName), termId, defaultTermId));
}

export function getCollegeShareUrl(collegeName: string) {
	return absoluteUrl(getCollegeCanonicalPath(collegeName));
}

export function getDivisionShareUrl(divisionName: string) {
	return absoluteUrl(getDivisionCanonicalPath(divisionName));
}

export function getRoomShareUrl(
	room: Pick<Room, 'id' | 'code'>,
	termId?: number | null,
	defaultTermId?: number | null
) {
	return absoluteUrl(withTermQuery(getRoomCanonicalPath(room), termId, defaultTermId));
}

export function getDormShareUrl(dorm: Pick<DormData, 'id' | 'dormName'>) {
	return absoluteUrl(getDormCanonicalPath(dorm));
}

export function getOrganizationShareUrl(organization: Pick<OrgData, 'id' | 'name'>) {
	return absoluteUrl(getOrganizationCanonicalPath(organization));
}

export function getPlaceShareUrl(place: Pick<PlaceData, 'id' | 'name' | 'category'>) {
	return absoluteUrl(getPlaceCanonicalPath(place));
}

export function getEventShareUrl(slug: string) {
	return absoluteUrl(getEventCanonicalPath(slug));
}

/** Deep link that reopens the app with a jeepney route active on the map. */
export function getJeepneyRouteShareUrl(routeId: string, stopIndex?: number, route?: JeepneyRoute) {
	return absoluteUrl(
		stopIndex != null ? getTransitStopPath(routeId, stopIndex, route) : getTransitRoutePath(routeId)
	);
}
