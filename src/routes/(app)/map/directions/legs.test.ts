import { describe, expect, test } from 'vitest';
import type { JeepJourney } from '#lib/utils/travel-graph/journey.js';
import { routeLegs, usesJeep } from './legs.js';

const from = { lat: 14.16, lon: 121.24 };
const to = { lat: 14.17, lon: 121.25 };
const jeep: JeepJourney = {
	seconds: 600,
	legs: [
		{ kind: 'walk', seconds: 60, meters: 80, coordinates: [[121.241, 14.161]] },
		{
			kind: 'ride',
			routeId: 'forestry',
			routeName: 'Forestry',
			color: '#16a34a',
			code: 'FR',
			fare: null,
			boardStopName: 'A',
			alightStopName: 'B',
			stopCount: 3,
			directionLabel: null,
			seconds: 400,
			meters: 2000,
			coordinates: [
				[121.242, 14.162],
				[121.248, 14.168]
			]
		},
		{ kind: 'walk', seconds: 60, meters: 80, coordinates: [[121.249, 14.169]] }
	]
};

describe('routeLegs', () => {
	test('walking is one blue line joined to both ends', () => {
		expect(routeLegs(from, to, [[121.245, 14.165]], null)).toEqual([
			{
				color: '#2563eb',
				coordinates: [
					[121.24, 14.16],
					[121.245, 14.165],
					[121.25, 14.17]
				]
			}
		]);
	});

	test('a jeep trip draws the ride in the route colour and joins the ends', () => {
		const legs = routeLegs(from, to, [], jeep);
		expect(legs.map((leg) => leg.color)).toEqual(['#2563eb', '#16a34a', '#2563eb']);
		expect(legs[0].coordinates[0]).toEqual([121.24, 14.16]);
		expect(legs[2].coordinates.at(-1)).toEqual([121.25, 14.17]);
	});
});

describe('usesJeep', () => {
	test('takes the jeep unless walking is asked for or no trip exists', () => {
		expect(usesJeep(new URLSearchParams(), jeep)).toBe(true);
		expect(usesJeep(new URLSearchParams('mode=walk'), jeep)).toBe(false);
		expect(usesJeep(new URLSearchParams(), null)).toBe(false);
	});
});
