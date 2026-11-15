import { describe, expect, it } from 'vitest';
import { parseEntityPathname } from './entity/entity-urls';
import { resolveLegacyEntityPath } from './legacy-entity-redirects';

describe('legacy entity redirects', () => {
	it('moves root-level entity paths under the map', () => {
		expect(resolveLegacyEntityPath('/building/baker-hall/')).toBe('/map/buildings/baker-hall/');
		expect(resolveLegacyEntityPath('/unit/postharvest-center-22/')).toBe(
			'/map/units/postharvest-center-22/'
		);
		expect(resolveLegacyEntityPath('/transit/forestry/narra-bridge/')).toBe(
			'/map/transit/forestry/narra-bridge/'
		);
	});

	it('moves the bare index paths too', () => {
		expect(resolveLegacyEntityPath('/building')).toBe('/map/buildings/');
		expect(resolveLegacyEntityPath('/room/')).toBe('/map/rooms/');
		expect(resolveLegacyEntityPath('/planner')).toBe('/map/planner/');
	});

	it('leaves paths that were never entity paths alone', () => {
		expect(resolveLegacyEntityPath('/changelog')).toBeNull();
		expect(resolveLegacyEntityPath('/map/buildings/baker-hall/')).toBeNull();
		// A prefix match is not enough: /events is not the old /event.
		expect(resolveLegacyEntityPath('/eventual/')).toBeNull();
	});

	it('no longer parses the old paths as entity paths', () => {
		expect(parseEntityPathname('/building/baker-hall/')).toBeNull();
		expect(parseEntityPathname('/map/buildings/baker-hall/')).toEqual({
			category: 'building',
			slug: 'baker-hall'
		});
	});
});
