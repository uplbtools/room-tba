import { describe, expect, test } from 'vitest';
import {
  ProposalValidationError,
  parseBundledRooms,
  validateBundledRooms,
  validateCreateProposalPatch,
} from "./proposals";

describe('create_jeepney_stop proposal validation', () => {
	test('requires a route, copy, and usable coordinates', () => {
		expect(() =>
			validateCreateProposalPatch('create_jeepney_stop', {
				routeId: 'kaliwa-kanan',
				name: 'New stop',
				description: 'Near the gate.',
				lat: 14.16,
				lon: 121.24
			})
		).not.toThrow();

		expect(() =>
			validateCreateProposalPatch('create_jeepney_stop', {
				routeId: 'kaliwa-kanan',
				name: '',
				description: 'Near the gate.',
				lat: 14.16,
				lon: 121.24
			})
		).toThrow(ProposalValidationError);
	});
});

describe("bundled room proposal photos", () => {
  test("preserves optional photo URLs in room drafts", () => {
    expect(
      parseBundledRooms({
        rooms: [
          {
            roomCode: "ICS 101",
            directions: "First floor",
            photoUrls: ["https://cdn.example.test/room.jpg"],
          },
        ],
      }),
    ).toEqual([
      {
        roomCode: "ICS 101",
        directions: "First floor",
        photoUrls: ["https://cdn.example.test/room.jpg"],
      },
    ]);
  });
});

describe('create proposal schemas keep their field messages', () => {
	const message = (type: Parameters<typeof validateCreateProposalPatch>[0], patch: Record<string, unknown>) => {
		try {
			validateCreateProposalPatch(type, patch);
			return null;
		} catch (err) {
			expect(err).toBeInstanceOf(ProposalValidationError);
			return (err as Error).message;
		}
	};

	test('missing and blank fields report the first failing field', () => {
		expect(message('create_building', {})).toBe('Building name is required.');
		expect(message('create_building', { buildingName: '  ' })).toBe('Building name is required.');
		expect(message('create_building', { buildingName: 'ICS' })).toBe('Pick a map location for the new building.');
		expect(message('create_event', { title: 'Fair' })).toBe('Event start and end are required.');
		expect(message('create_dorm', { dormName: 'Molave' })).toBe('Dorm gender is required.');
		expect(message('create_place', { name: 'Cafe', category: 'nope', lat: 1, lon: 2 })).toBe('Pick a valid place category.');
		expect(message('create_organization', { name: 'Org', category: 'nope' })).toBe('Pick a valid organization category.');
		expect(message('create_room', { roomCode: 'C-101', buildingId: 0 })).toBe('Pick the building this room belongs to.');
		expect(message('create_jeepney_stop', { routeId: 'r', name: 'n', description: 'd', lat: Number.NaN, lon: 1 })).toBe('Pick a valid stop location.');
	});

	test('valid patches pass, including a numeric-string building id', () => {
		expect(message('create_room', { roomCode: 'C-101', buildingId: '12' })).toBeNull();
		expect(message('create_college', { collegeName: 'CAS' })).toBeNull();
		expect(message('create_building', { buildingName: 'ICS', lat: 1, lon: 2 })).toBeNull();
	});

	test('bundled rooms are capped and must be unique', () => {
		const rooms = (codes: string[]) => codes.map((roomCode) => ({ roomCode }));
		expect(message('create_building', { buildingName: 'ICS', lat: 1, lon: 2, rooms: rooms(['A', 'a']) })).toBe(
			'Duplicate room code in this suggestion: a'
		);
		expect(() => validateBundledRooms(parseBundledRooms({ rooms: rooms(['A', 'B', 'C']) }), 2)).toThrow(
			'Add at most 2 rooms in one building suggestion.'
		);
	});

	test('malformed room entries are dropped', () => {
		expect(parseBundledRooms({ rooms: [null, 'x', { roomCode: ' ' }, { roomCode: ' B ', photoUrls: [1, 'u'] }] })).toEqual([
			{ roomCode: 'B', directions: '', photoUrls: ['u'] }
		]);
		expect(parseBundledRooms({})).toEqual([]);
	});
});
