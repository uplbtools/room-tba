import { describe, expect, it } from 'vitest';
import {
	entityIndexPath,
	getBuildingCanonicalPath,
	getDormCanonicalPath,
	getEventCanonicalPath,
	getOrganizationCanonicalPath,
	getPlaceCanonicalPath,
	getRoomCanonicalPath,
	parseEntityPathname,
	parseRouteSlug
} from './entity-urls';

describe('entity-urls', () => {
	it('parses entity pathnames', () => {
		expect(parseEntityPathname('/map/buildings/baker-hall/')).toEqual({
			category: 'building',
			slug: 'baker-hall'
		});
		expect(parseEntityPathname('/map/events/my-event/')).toEqual({
			category: 'event',
			slug: 'my-event'
		});
		expect(parseEntityPathname('/map/organizations/debate-society-7/')).toEqual({
			category: 'organization',
			slug: 'debate-society-7'
		});
		expect(parseEntityPathname('/map/establishments/but-first-coffee-8/')).toEqual({
			category: 'place',
			slug: 'but-first-coffee-8'
		});
		expect(parseEntityPathname('/changelog')).toBeNull();
	});

	it('parses route slugs with numeric ids', () => {
		expect(parseRouteSlug('baker-hall-42')).toEqual({
			nameSlug: 'baker-hall',
			id: 42
		});
		expect(parseRouteSlug('baker-hall')).toEqual({
			nameSlug: 'baker-hall',
			id: null
		});
	});

	it('builds canonical entity paths from ids', () => {
		expect(getBuildingCanonicalPath({ id: 1 })).toBe('/map/buildings/1');
		expect(getRoomCanonicalPath({ id: 12 })).toBe('/map/rooms/12');
		expect(getDormCanonicalPath({ id: 3 })).toBe('/map/dorms/3');
		expect(getEventCanonicalPath({ id: 5 })).toBe('/map/events/5');
		expect(getOrganizationCanonicalPath({ id: 7 })).toBe('/map/organizations/7');
		expect(getPlaceCanonicalPath({ id: 8 })).toBe('/map/places/8');
		expect(entityIndexPath('places')).toBe('/map/places');
	});
});
