import type { AppContextData } from '#lib/utils/context.js';

export function loadedAppContext(
	overrides: Partial<Extract<AppContextData, { loaded: true }>> = {}
): Extract<AppContextData, { loaded: true }> {
	return {
		loaded: true,
		buildings: overrides.buildings ?? [
			{
				id: 1,
				buildingName: 'Class Hall',
				lat: 14.165,
				lon: 121.241,
				buildingType: 'non-admin',
				directions: '',
				imageUrl: null,
				crFacilities: null,
				version: 1,
				updatedAt: '2026-01-01'
			}
		],
		colleges: overrides.colleges ?? [],
		divisions: overrides.divisions ?? [],
		dorms: overrides.dorms ?? [
			{
				id: 1,
				dormName: 'UP Dorm',
				shortName: null,
				lat: 14.166,
				lon: 121.242,
				gender: 'coed',
				capacity: null,
				managingOffice: null,
				contactEmail: null,
				amenities: null,
				osmLink: null,
				description: null,
				isUpManaged: true,
				priceRange: null,
				contactPhone: null,
				facebookLink: null,
				imageUrl: null,
				version: 1,
				updatedAt: '2026-01-01'
			}
		],
		events: overrides.events ?? [],
		organizations: overrides.organizations ?? [],
		places: overrides.places ?? [],
		totalRooms: overrides.totalRooms ?? 1,
		directionCount: overrides.directionCount ?? 1
	};
}
