import {
	type JeepneyFare,
	type JeepneyRoute,
	ROUTE_LINE_CODES
} from '#lib/constants/map/jeepney-routes.js';
import {
	JEEPNEY_KPH,
	JEEPNEY_WAIT_SECONDS,
	MAX_ACCESS_WALK_METERS,
	MIN_RIDE_SAVING_SECONDS,
	STOP_SNAP_TOLERANCE_METERS,
	WALK_KPH
} from '#lib/constants/travel-modes.js';
import { distanceMeters } from '#lib/utils/campus/campus-route.js';
import { activeDirection, routeDirections } from '#lib/utils/transit/transit-direction.js';
import { isLoopRoute, perBoardingFare } from '#lib/utils/transit/transit-route-kind.js';
import {
	dijkstra,
	nearestNodeIndex,
	reconstructPath,
	snapToNetwork,
	type LatLon,
	type TravelGraph,
	type TravelRoute
} from './engine.js';
import { polylineMeters, sliceRouteLine } from './ride-geometry.js';

export type WalkLeg = { kind: 'walk' } & TravelRoute;

export type RideLeg = {
	kind: 'ride';
	routeId: string;
	routeName: string;
	color: string;
	/** The sign code for this direction, such as KN or FR. */
	code: string | null;
	fare: JeepneyFare | null;
	boardStopName: string;
	alightStopName: string;
	/** Stops passed through, board and alight included. */
	stopCount: number;
	directionLabel: string | null;
	/** Wait at the boarding stop plus time on the jeep. */
	seconds: number;
	meters: number;
	/** [lng, lat] GeoJSON order. */
	coordinates: [number, number][];
};

export type JeepJourney = { seconds: number; legs: [WalkLeg, RideLeg, WalkLeg] };

/** A road slice this much longer than the stop chain went the wrong way round. */
const MAX_ROAD_DETOUR = 2.5;

const WALK_MPS = WALK_KPH / 3.6;
const JEEPNEY_MPS = JEEPNEY_KPH / 3.6;

/** Both ways round, except a one-way loop. */
function directedRoutes(route: JeepneyRoute, line: [number, number][] | null) {
	const runs = [{ reversed: false, stops: route.stops, line }];
	if (routeDirections(route.id) || !isLoopRoute(route)) {
		runs.push({
			reversed: true,
			stops: [...route.stops].reverse(),
			line: line && [...line].reverse()
		});
	}
	return runs;
}

function chordMeters(stops: JeepneyRoute['stops'], board: number, alight: number) {
	let meters = 0;
	for (let i = board; i < alight; i++) meters += distanceMeters(stops[i], stops[i + 1]);
	return meters;
}

/**
 * The fastest walk, ride, walk trip on one jeep line, or null when walking is
 * as quick within a few minutes. Routes are campus jeeps and `lines` holds each
 * route's road geometry by id.
 */
export function planJeepRide(
	graph: TravelGraph,
	from: LatLon,
	to: LatLon,
	routes: JeepneyRoute[],
	lines: Readonly<Record<string, [number, number][] | null>>,
	walkSeconds: number
): JeepJourney | null {
	const start = snapToNetwork(graph, from);
	const end = snapToNetwork(graph, to);
	if (start === null || end === null) return null;
	const fromStart = dijkstra(graph, start, 'walk');
	const fromEnd = dijkstra(graph, end, 'walk');

	let best: {
		route: JeepneyRoute;
		run: ReturnType<typeof directedRoutes>[number];
		nodes: number[];
		board: number;
		alight: number;
		seconds: number;
	} | null = null;

	for (const route of routes) {
		for (const run of directedRoutes(route, lines[route.id] ?? null)) {
			const nodes = run.stops.map((stop) => {
				const node = nearestNodeIndex(graph, stop.lat, stop.lon);
				const gap = distanceMeters(stop, { lat: graph.lat[node], lon: graph.lng[node] });
				return gap > STOP_SNAP_TOLERANCE_METERS ? -1 : node;
			});
			const reachable = (seconds: number) => seconds * WALK_MPS <= MAX_ACCESS_WALK_METERS;
			for (let board = 0; board < nodes.length - 1; board++) {
				if (nodes[board] < 0 || !reachable(fromStart.seconds[nodes[board]])) continue;
				for (let alight = board + 1; alight < nodes.length; alight++) {
					if (nodes[alight] < 0 || !reachable(fromEnd.seconds[nodes[alight]])) continue;
					const ride = chordMeters(run.stops, board, alight);
					const seconds =
						fromStart.seconds[nodes[board]] +
						JEEPNEY_WAIT_SECONDS +
						ride / JEEPNEY_MPS +
						fromEnd.seconds[nodes[alight]];
					if (ride > 0 && (!best || seconds < best.seconds)) {
						best = { route, run, nodes, board, alight, seconds };
					}
				}
			}
		}
	}
	if (!best || best.seconds > walkSeconds - MIN_RIDE_SAVING_SECONDS) return null;

	const { route, run, nodes, board, alight } = best;
	const access = reconstructPath(graph, fromStart, start, nodes[board]);
	const egress = reconstructPath(graph, fromEnd, end, nodes[alight]);
	if (!access || !egress) return null;

	const chord = chordMeters(run.stops, board, alight);
	const road = run.line && sliceRouteLine(run.line, run.stops[board], run.stops[alight]);
	const roadMeters = road ? polylineMeters(road) : 0;
	const onRoad = !!road && roadMeters >= chord * 0.9 && roadMeters <= chord * MAX_ROAD_DETOUR + 200;
	const ridden = run.stops.slice(board, alight + 1);
	const meters = onRoad ? roadMeters : chord;
	const codes = ROUTE_LINE_CODES[route.id];
	const ride: RideLeg = {
		kind: 'ride',
		routeId: route.id,
		routeName: route.name,
		color: route.color,
		code: codes?.[run.reversed ? 1 : 0] ?? codes?.[0] ?? null,
		fare: perBoardingFare(route),
		boardStopName: run.stops[board].name,
		alightStopName: run.stops[alight].name,
		stopCount: ridden.length,
		directionLabel: activeDirection(route.id, run.reversed)?.label ?? null,
		seconds: JEEPNEY_WAIT_SECONDS + meters / JEEPNEY_MPS,
		meters,
		coordinates:
			onRoad && road ? road : ridden.map((stop): [number, number] => [stop.lon, stop.lat])
	};
	// The egress path is rooted at the destination, so it arrives backwards.
	const home: WalkLeg = { kind: 'walk', ...egress, coordinates: [...egress.coordinates].reverse() };
	return {
		seconds: access.seconds + ride.seconds + home.seconds,
		legs: [{ kind: 'walk', ...access }, ride, home]
	};
}
