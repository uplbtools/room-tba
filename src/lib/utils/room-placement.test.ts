import { describe, expect, it } from 'vitest';
import type { LocalPolygonData } from './building-3d';
import {
	inferBuildingPlacements,
	inferRoomPlacement,
	inferRoomSignal,
	maxInferredFloor,
	pointInPolygon
} from './room-placement';

/** 60 m (east-west) x 20 m (north-south) rectangle centred on the origin. */
const RECT: LocalPolygonData = {
	points: [
		{ x: -30, y: -10 },
		{ x: 30, y: -10 },
		{ x: 30, y: 10 },
		{ x: -30, y: 10 }
	],
	widthMeters: 60,
	depthMeters: 20,
	centerLat: 14.1643,
	centerLon: 121.2418
};

function floorOf(code: string, directions?: string) {
	return inferRoomSignal({ roomCode: code, directions })?.floor ?? null;
}

describe('floor inference from real UPLB room codes', () => {
	it.each([
		['PS B-203', 2],
		['CEM 116', 1],
		['CAS A2 102', 1],
		['BS B-101', 1],
		['IFST 109', 1],
		['ASI B-126', 1],
		['ASI 333', 3],
		['ASI 238A', 2],
		['ABC 162a', 1],
		['ASILH B125', 1],
		['PS ANX-300', 3],
		['BS A-409', 4],
		['General Physio Lab (Rm. 100)', 1]
	])('reads %s as floor %i', (code, floor) => {
		expect(floorOf(code)).toBe(floor);
	});

	it('says where the floor came from', () => {
		expect(inferRoomSignal({ roomCode: 'CEM 116' })?.reason).toContain('floor 1');
		expect(inferRoomSignal({ roomCode: 'CEM 116' })?.confidence).toBe('high');
	});

	it('reads the wing letter and room number for the corridor heuristic', () => {
		const signal = inferRoomSignal({ roomCode: 'PS B-203' });
		expect(signal?.wing).toBe('B');
		expect(signal?.unit).toBe(3);
	});
});

describe('codes that carry no floor signal return null', () => {
	it.each([
		'CDC DECIMU',
		'CEAT SHOP RM',
		'CHE 1',
		'ASLH 2',
		'TCC-01',
		'ICOPED 26',
		'AFBED PHYSLAB',
		'SWIMMING POOL',
		'MBBLH',
		'Fronda Hall RM. 24'
	])('declines %s', (code) => {
		expect(inferRoomSignal({ roomCode: code })).toBeNull();
	});

	it('declines basement codes rather than pinning them to the ground floor', () => {
		// `room_positions.floor` cannot express "below ground".
		expect(inferRoomSignal({ roomCode: 'CAS B05' })).toBeNull();
		expect(inferRoomSignal({ roomCode: 'CAS B10' })).toBeNull();
		expect(inferRoomSignal({ roomCode: 'LAB X', directions: 'In the basement.' })).toBeNull();
	});
});

describe('directions text', () => {
	it('places a room whose code has no number', () => {
		const signal = inferRoomSignal({
			roomCode: 'EAA LH',
			directions: '2nd floor of Physical Sciences Building, across the PC labs.'
		});
		expect(signal?.floor).toBe(2);
		expect(signal?.confidence).toBe('medium');
	});

	it('understands worded floors and wings', () => {
		const signal = inferRoomSignal({
			roomCode: 'PSLH A',
			directions: 'In the Physical Sciences Building. Ground floor, easy to spot.'
		});
		expect(signal?.floor).toBe(1);

		expect(
			inferRoomSignal({
				roomCode: 'BS A-109',
				directions: 'Biological Sciences Building, Wing A, floor 1 (ground).'
			})?.wing
		).toBe('A');
	});

	it('corroborating directions keep confidence high', () => {
		const signal = inferRoomSignal({
			roomCode: 'ASI 333',
			directions: 'Enter right hallway after reaching ICropS. Third floor.'
		});
		expect(signal?.floor).toBe(3);
		expect(signal?.confidence).toBe('high');
	});
});

describe('confidence degrades honestly', () => {
	it('drops to low and keeps the room code when the directions disagree', () => {
		const signal = inferRoomSignal({
			roomCode: 'PS B-203',
			directions: 'Third floor, past the balcony.'
		});
		expect(signal?.floor).toBe(2);
		expect(signal?.confidence).toBe('low');
		expect(signal?.reason).toContain('we used the room number');
	});

	it.each([
		['PS B-203', 'Enter through the ground floor lobby, then take the stairs.', 2],
		['PS B-305', 'From the 1st floor entrance, go up two flights.', 3],
		['BS A-409', 'Take the elevator from the ground floor.', 4],
		['CEM 216', 'Beside the 1st floor canteen, one level above.', 2]
	])('route prose about the way in does not drag %s down a floor', (code, directions, floor) => {
		// Directions here are walking directions. They name the entrance far more
		// often than the destination, so prose must not outrank the room code.
		expect(inferRoomSignal({ roomCode: code, directions })?.floor).toBe(floor);
	});

	it('drops to low when the floor has to be clamped to the model', () => {
		const signal = inferRoomSignal({ roomCode: 'BS A-409' }, 2);
		expect(signal?.floor).toBe(2);
		expect(signal?.confidence).toBe('low');
		expect(signal?.reason).toContain('clamped');
	});

	it("never claims better than 'high', and only for coded floors", () => {
		const coded = inferRoomSignal({ roomCode: 'CEM 116' })?.confidence;
		const prose = inferRoomSignal({
			roomCode: 'EE AUDI',
			directions: 'Main entrance - second floor left hallway.'
		})?.confidence;
		expect(coded).toBe('high');
		expect(prose).toBe('medium');
	});
});

describe('x/y placement', () => {
	const rooms = [
		{ roomCode: 'BS A-101' },
		{ roomCode: 'BS A-102' },
		{ roomCode: 'BS A-103' },
		{ roomCode: 'BS B-105' },
		{ roomCode: 'BS B-201' },
		{ roomCode: 'CDC DECIMU' }
	];

	it('keeps every inferred pin inside the footprint', () => {
		const placements = inferBuildingPlacements(rooms, RECT, 3);
		expect(placements.size).toBe(5);
		for (const p of placements.values()) {
			expect(pointInPolygon({ x: p.posX, y: p.posY }, RECT.points)).toBe(true);
		}
	});

	it('puts odd and even room numbers on opposite sides of the corridor', () => {
		const placements = inferBuildingPlacements(rooms, RECT, 3);
		const odd = placements.get('BS A-101');
		const even = placements.get('BS A-102');
		expect(Math.sign(odd?.posY ?? 0)).toBe(-Math.sign(even?.posY ?? 0));
	});

	it('separates rooms that share a floor and a side', () => {
		const placements = inferBuildingPlacements(rooms, RECT, 3);
		const a = placements.get('BS A-101');
		const b = placements.get('BS A-103');
		expect(a?.posX).not.toBe(b?.posX);
	});

	it('always labels the position as an estimate', () => {
		const placement = inferRoomPlacement({ roomCode: 'CEM 116' }, RECT, 3);
		expect(placement?.reason).toContain('corridor estimate');
		expect(placement?.reason).toContain('not a surveyed location');
	});

	it('is deterministic', () => {
		const first = inferBuildingPlacements(rooms, RECT, 3);
		const second = inferBuildingPlacements(rooms, RECT, 3);
		expect([...second]).toEqual([...first]);
	});

	it('returns null for a room with no signal', () => {
		expect(inferRoomPlacement({ roomCode: 'CEAT SHOP RM' }, RECT, 3)).toBeNull();
	});
});

describe('human-placed rooms are never touched', () => {
	it('omits skipped codes from the suggestions', () => {
		const rooms = [{ roomCode: 'BS A-101' }, { roomCode: 'BS A-103' }];
		const placements = inferBuildingPlacements(rooms, RECT, 3, new Set(['BS A-101']));
		expect(placements.has('BS A-101')).toBe(false);
		expect(placements.has('BS A-103')).toBe(true);
	});
});

describe('maxInferredFloor', () => {
	it('reports the tallest floor the codes imply', () => {
		expect(maxInferredFloor(['CEM 116', 'ASI 333', 'CDC DECIMU'])).toBe(3);
		expect(maxInferredFloor(['CDC DECIMU', 'CHE 1'])).toBeNull();
	});
});
