import { describe, expect, test } from 'vitest';
import type { JeepneyRoute } from '#lib/constants/map/jeepney-routes.js';
import { JEEPNEY_WAIT_SECONDS } from '#lib/constants/travel-modes.js';
import { buildTravelGraph, type WalkGraphData } from './engine.js';
import { planJeepRide } from './journey.js';

const LAT = 14.16;
const KM = 1000 / 111_320;
const nodeAt = (index: number) => ({ lat: LAT + index * KM, lon: 121.24 });

/** A straight 4 km footway of five nodes, 1 km apart. */
const walkGraph: WalkGraphData = {
	meta: { coordScale: 1e6, nodeCount: 5, edgeCount: 4 },
	nodes: [0, 1, 2, 3, 4].map((i) => [i + 1, nodeAt(i).lat, 121.24]),
	edges: [0, 1, 2, 3].map((i) => [i, i + 1, 1000, 'footway', null, []])
};
const graph = buildTravelGraph(walkGraph);

const route: JeepneyRoute = {
	id: 'corridor',
	name: 'Corridor Line',
	description: '',
	color: '#dc2626',
	fare: { regular: 14, discounted: 12 },
	stops: [0, 2, 4].map((i) => ({ name: `Stop ${i}`, description: '', ...nodeAt(i) }))
};

const walkSeconds = (km: number) => (km * 1000) / (4.5 / 3.6);

describe('planJeepRide', () => {
	test('rides when it beats walking, counting the wait', () => {
		const journey = planJeepRide(graph, nodeAt(0), nodeAt(4), [route], {}, walkSeconds(4));
		const ride = journey?.legs[1];
		expect(ride?.boardStopName).toBe('Stop 0');
		expect(ride?.alightStopName).toBe('Stop 4');
		expect(ride?.stopCount).toBe(3);
		expect(ride?.directionLabel).toBeNull();
		expect(journey?.legs[0].meters).toBe(0);
		expect(journey?.legs[2].meters).toBe(0);
		expect(journey?.seconds).toBeCloseTo(4000 / (14 / 3.6) + JEEPNEY_WAIT_SECONDS, -1);
	});

	test('names the direction and sign code of a two-way route ridden backwards', () => {
		const journey = planJeepRide(
			graph,
			nodeAt(4),
			nodeAt(0),
			[{ ...route, id: 'kaliwa-kanan' }],
			{},
			walkSeconds(4)
		);
		const ride = journey?.legs[1];
		expect(ride?.boardStopName).toBe('Stop 4');
		expect(ride?.directionLabel).toBe('Kaliwa');
		expect(ride?.code).toBe('KL');
		expect(ride?.fare).toEqual({ regular: 14, discounted: 12 });
	});

	test('keeps walking when the ride barely saves time', () => {
		expect(planJeepRide(graph, nodeAt(1), nodeAt(2), [route], {}, walkSeconds(1))).toBeNull();
	});

	test('ignores stops too far to walk to', () => {
		const far = { ...route, stops: route.stops.map((stop) => ({ ...stop, lon: 122.24 })) };
		expect(planJeepRide(graph, nodeAt(0), nodeAt(4), [far], {}, walkSeconds(4))).toBeNull();
	});

	test('legs join end to end', () => {
		const journey = planJeepRide(graph, nodeAt(0), nodeAt(4), [route], {}, walkSeconds(4));
		const [walkIn, ride, walkOut] = journey!.legs;
		expect(ride.coordinates[0]).toEqual(walkIn.coordinates.at(-1));
		expect(ride.coordinates.at(-1)).toEqual(walkOut.coordinates[0]);
	});

	test('draws the ride along the road when the line has one', () => {
		const line: [number, number][] = [0, 1, 2, 3, 4].map((i) => [121.24, nodeAt(i).lat]);
		const journey = planJeepRide(
			graph,
			nodeAt(0),
			nodeAt(4),
			[route],
			{ corridor: line },
			walkSeconds(4)
		);
		expect(journey?.legs[1].coordinates.length).toBeGreaterThan(3);
	});
});
