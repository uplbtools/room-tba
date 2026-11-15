import { describe, expect, it, vi } from 'vitest';

vi.mock('#lib/utils/db.js', () => {
	const rows = [
		{ id: 4, name: 'Baker Hall' },
		{ id: 9, name: 'uplb-fair' }
	];
	const chain = {
		from: () => chain,
		where: () => chain,
		limit: () => Promise.resolve([{ id: 9 }]),
		then: (done: (value: typeof rows) => unknown) => Promise.resolve(rows).then(done)
	};
	return { db: { select: () => chain } };
});

const { resolveLegacyEntityPath } = await import('./legacy-entity-redirects');

describe('legacy entity redirects', () => {
	it('moves root-level slug paths to id routes under the map', async () => {
		expect(await resolveLegacyEntityPath('/building/baker-hall/')).toBe('/map/buildings/4');
		expect(await resolveLegacyEntityPath('/room/ics-260-12')).toBe('/map/rooms/12');
		expect(await resolveLegacyEntityPath('/unit/postharvest-center-22/')).toBe(
			'/map/organizations/22'
		);
		expect(await resolveLegacyEntityPath('/establishment/but-first-coffee-8')).toBe(
			'/map/places/8'
		);
		expect(await resolveLegacyEntityPath('/event/uplb-fair')).toBe('/map/events/9');
		expect(await resolveLegacyEntityPath('/transit/forestry/narra-bridge/')).toBe(
			'/map/transit/forestry'
		);
	});

	it('sends unknown slugs and bare paths to the index', async () => {
		expect(await resolveLegacyEntityPath('/building/no-such-hall')).toBe('/map/buildings');
		expect(await resolveLegacyEntityPath('/room/')).toBe('/map/rooms');
		expect(await resolveLegacyEntityPath('/planner')).toBe('/map/planner');
		expect(await resolveLegacyEntityPath('/final-exams')).toBe('/map/final-exams');
		expect(await resolveLegacyEntityPath('/admin')).toBe('/map/admin');
	});

	it('leaves paths that were never entity paths alone', async () => {
		expect(await resolveLegacyEntityPath('/changelog')).toBeNull();
		expect(await resolveLegacyEntityPath('/map/buildings/4')).toBeNull();
		expect(await resolveLegacyEntityPath('/eventual/')).toBeNull();
	});
});
