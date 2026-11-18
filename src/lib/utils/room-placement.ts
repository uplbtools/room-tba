/**
 * Best-effort room placement inference for the 3D building viewer.
 *
 * Pure: no DB, no fetch. Given a room code (plus whatever directions prose we
 * have) it answers "which floor, and roughly where on it". A wrong pin is worse
 * than no pin — students walk to these — so anything without a real signal
 * returns `null` instead of a guess.
 *
 * Floor is the trustworthy part (UPLB codes encode it: `PS B-203` → floor 2).
 * posX/posY are always a corridor heuristic; see `reason` on every result.
 */

import type { LocalPolygonData } from './building-3d';

/** How much to trust the inferred **floor**. posX/posY are never better than a guess. */
export type PlacementConfidence = 'high' | 'medium' | 'low';

export type InferredPlacement = {
	/** 1-indexed floor (1 = ground). */
	floor: number;
	/** Local meters east of the building centroid. */
	posX: number;
	/** Local meters north of the building centroid. */
	posY: number;
	/** Confidence in `floor` only — the reason string states the x/y basis. */
	confidence: PlacementConfidence;
	/** Human-readable justification, shown to the editor before they accept. */
	reason: string;
};

export type RoomPlacementInput = {
	roomCode: string;
	/** Unused today; kept so per-building rules have somewhere to land. */
	buildingName?: string | null;
	directions?: string | null;
};

/** What we could read out of a room code / its directions, before layout. */
export type RoomSignal = {
	floor: number;
	/** Wing letter (A–E) when the code or directions name one. */
	wing: string | null;
	/** Room number used for the odd/even side convention, when readable. */
	unit: number | null;
	confidence: PlacementConfidence;
	reason: string;
};

const WORD_FLOORS: Record<string, number> = {
	ground: 1,
	first: 1,
	second: 2,
	third: 3,
	fourth: 4,
	fifth: 5,
	sixth: 6
};

const MAX_FLOOR = 12;

/** `B01`-style codes are basements (`CAS B05` = CAS basement room 05). */
const BASEMENT_UNIT = /(?:^|[\s\-_])B\d{2}(?![\dA-Z])/i;

/** The room-number run: 3–4 digits, optionally prefixed by a wing letter. */
const NUMBER_TOKEN = /(?:(?:^|[\s\-_(.])([A-E])[\s-]?)?(\d{3,4})(?![\d])/i;

function floorFromDigits(digits: string): number | null {
	const floor = Number(digits[0]);
	if (!Number.isInteger(floor) || floor < 1 || floor > MAX_FLOOR) return null;
	return floor;
}

/**
 * Read floor / wing / room number straight out of the code.
 * Returns null when the code carries no floor signal at all.
 */
function readCodeSignal(
	roomCode: string
): { floor: number; wing: string | null; unit: number | null } | null {
	const code = roomCode.trim().toUpperCase();
	// A basement room number is a real signal, but `room_positions.floor` has no
	// way to say "below ground", so we decline rather than pin it to floor 1.
	if (BASEMENT_UNIT.test(code)) return null;

	const match = NUMBER_TOKEN.exec(code);
	if (!match) return null;

	const digits = match[2] as string;
	const floor = floorFromDigits(digits);
	if (floor === null) return null;

	return {
		floor,
		wing: match[1] ? match[1].toUpperCase() : null,
		unit: Number(digits.slice(1))
	};
}

/** Read a floor / wing out of hand-written walking directions. */
function readDirectionsSignal(directions: string | null | undefined): {
	floor: number | null;
	wing: string | null;
} {
	const text = (directions ?? '').trim();
	if (!text) return { floor: null, wing: null };

	const wingMatch = /\bwing\s+([A-E])\b/i.exec(text);
	const wing = wingMatch?.[1] ? wingMatch[1].toUpperCase() : null;

	// "In the basement, below the 2nd floor lab" must not yield floor 2.
	if (/\bbasement\b/i.test(text)) return { floor: null, wing };

	const ordinal = /\b([1-9])\s*(?:st|nd|rd|th)\s*floor\b/i.exec(text);
	const numbered = /\bfloor\s*([1-9])\b/i.exec(text);
	const shorthand = /\b([1-9])F\b/.exec(text);
	const worded = /\b(ground|first|second|third|fourth|fifth|sixth)\s+floor\b/i
		.exec(text)?.[1]
		?.toLowerCase();

	const floor =
		(ordinal?.[1] && Number(ordinal[1])) ||
		(numbered?.[1] && Number(numbered[1])) ||
		(shorthand?.[1] && Number(shorthand[1])) ||
		(worded && WORD_FLOORS[worded]) ||
		null;

	return { floor: floor && floor <= MAX_FLOOR ? floor : null, wing };
}

/**
 * Combine code + directions into a single floor signal, or null when neither
 * says anything usable (`CDC DECIMU`, `CEAT SHOP RM`, `CHE 1`, `TCC-01`).
 *
 * `floorCount` clamps impossible floors and honestly downgrades confidence
 * when it has to.
 */
export function inferRoomSignal(
	room: RoomPlacementInput,
	floorCount = MAX_FLOOR
): RoomSignal | null {
	const code = readCodeSignal(room.roomCode);
	const prose = readDirectionsSignal(room.directions);
	const wing = code?.wing ?? prose.wing;
	const floors = Math.max(1, Math.floor(floorCount));

	let floor: number;
	let confidence: PlacementConfidence;
	let reason: string;

	if (code && prose.floor !== null && code.floor !== prose.floor) {
		// Directions are walking directions: they name the way in ("enter through
		// the ground floor, then take the stairs") at least as often as the
		// destination. So a floor in the prose that fights the room code is
		// usually the lobby, not the room. The code is a statement about the room
		// itself, so it wins; the disagreement is named and confidence drops.
		floor = code.floor;
		confidence = 'low';
		reason = `"${room.roomCode}" implies floor ${code.floor}. The directions mention floor ${prose.floor}, which is more often the way in than the room, so we used the room number`;
	} else if (code && prose.floor !== null) {
		floor = code.floor;
		confidence = 'high';
		reason = `Room number ${code.floor}${String(code.unit ?? '').padStart(2, '0')} → floor ${code.floor}, confirmed by the directions`;
	} else if (code) {
		floor = code.floor;
		confidence = 'high';
		reason = `First digit of the room number → floor ${code.floor} (UPLB numbering convention)`;
	} else if (prose.floor !== null) {
		floor = prose.floor;
		confidence = 'medium';
		reason = `Directions text names floor ${prose.floor}, and the code carries no number`;
	} else {
		return null;
	}

	if (floor > floors) {
		reason = `${reason}; clamped to floor ${floors} because the model only has ${floors}`;
		floor = floors;
		confidence = 'low';
	}

	return { floor, wing, unit: code?.unit ?? null, confidence, reason };
}

function polygonBounds(polygon: LocalPolygonData) {
	let minX = Infinity;
	let maxX = -Infinity;
	let minY = Infinity;
	let maxY = -Infinity;
	for (const p of polygon.points) {
		if (p.x < minX) minX = p.x;
		if (p.x > maxX) maxX = p.x;
		if (p.y < minY) minY = p.y;
		if (p.y > maxY) maxY = p.y;
	}
	return { minX, maxX, minY, maxY };
}

function polygonCentroid(polygon: LocalPolygonData) {
	const n = polygon.points.length || 1;
	return {
		x: polygon.points.reduce((sum, p) => sum + p.x, 0) / n,
		y: polygon.points.reduce((sum, p) => sum + p.y, 0) / n
	};
}

export function pointInPolygon(
	point: { x: number; y: number },
	ring: { x: number; y: number }[]
): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const a = ring[i];
		const b = ring[j];
		if (!a || !b) continue;
		const intersects =
			a.y > point.y !== b.y > point.y &&
			point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y + 1e-12) + a.x;
		if (intersects) inside = !inside;
	}
	return inside;
}

/** Slide a candidate point toward the centroid until it lands inside the shape. */
function pullInside(
	point: { x: number; y: number },
	polygon: LocalPolygonData
): { x: number; y: number } {
	if (pointInPolygon(point, polygon.points)) return point;
	const centre = polygonCentroid(polygon);
	for (let step = 1; step <= 8; step++) {
		const t = step / 8;
		const candidate = {
			x: point.x + (centre.x - point.x) * t,
			y: point.y + (centre.y - point.y) * t
		};
		if (pointInPolygon(candidate, polygon.points)) return candidate;
	}
	return centre;
}

type SignalledRoom = { code: string; signal: RoomSignal };

/**
 * Lay out one floor's rooms along the building's long axis (the corridor),
 * split by wing, with odd/even room numbers on opposite sides — the convention
 * UPLB directions describe ("odd- and even-numbered rooms alternate sides").
 *
 * ponytail: rectangular corridor model. Good enough for a suggestion an editor
 * confirms by eye; upgrade to real floor plans if we ever get them.
 */
function layoutFloor(
	rooms: SignalledRoom[],
	polygon: LocalPolygonData
): Map<string, { x: number; y: number; basis: string }> {
	const out = new Map<string, { x: number; y: number; basis: string }>();
	const { minX, maxX, minY, maxY } = polygonBounds(polygon);
	const spanX = maxX - minX;
	const spanY = maxY - minY;
	// Corridors run along the building's long axis.
	const alongX = spanX >= spanY;
	const alongMin = alongX ? minX : minY;
	const alongSpan = (alongX ? spanX : spanY) || 1;
	const acrossMid = alongX ? (minY + maxY) / 2 : (minX + maxX) / 2;
	const acrossSpan = (alongX ? spanY : spanX) || 1;
	const sideOffset = acrossSpan * 0.22;

	const wings = [...new Set(rooms.map((r) => r.signal.wing ?? ''))].sort();

	for (const wing of wings) {
		const inWing = rooms
			.filter((r) => (r.signal.wing ?? '') === wing)
			.sort((a, b) => (a.signal.unit ?? 0) - (b.signal.unit ?? 0) || a.code.localeCompare(b.code));
		const wingIndex = wings.indexOf(wing);
		const wingStart = alongMin + (alongSpan * wingIndex) / wings.length;
		const wingSpan = alongSpan / wings.length;

		// Odd / even / unknown-parity lanes, each spread along the wing segment.
		const lanes = new Map<number, SignalledRoom[]>();
		for (const room of inWing) {
			const parity = room.signal.unit === null ? 0 : room.signal.unit % 2 === 1 ? 1 : -1;
			const lane = lanes.get(parity) ?? [];
			lane.push(room);
			lanes.set(parity, lane);
		}

		for (const [parity, lane] of lanes) {
			lane.forEach((room, index) => {
				const t = (index + 0.5) / lane.length;
				const along = wingStart + wingSpan * t;
				const across = acrossMid + sideOffset * parity;
				const point = pullInside(
					alongX ? { x: along, y: across } : { x: across, y: along },
					polygon
				);
				const wingPart = wing ? `wing ${wing}` : 'no wing letter';
				const sidePart =
					parity === 0
						? 'no odd/even signal, centred on the corridor'
						: `${parity === 1 ? 'odd' : 'even'} side`;
				out.set(room.code, {
					x: point.x,
					y: point.y,
					basis: `${wingPart}, ${sidePart}`
				});
			});
		}
	}

	return out;
}

/**
 * Infer placements for a whole building at once — rooms need their siblings to
 * be spread sensibly along a corridor.
 *
 * `skipCodes` (e.g. rooms an editor already positioned by hand) are left out of
 * the result entirely, and out of the spacing maths, so accepting suggestions
 * can never move a human-placed pin.
 */
export function inferBuildingPlacements(
	rooms: RoomPlacementInput[],
	polygon: LocalPolygonData,
	floorCount: number,
	skipCodes: ReadonlySet<string> = new Set()
): Map<string, InferredPlacement> {
	const result = new Map<string, InferredPlacement>();
	if (polygon.points.length === 0) return result;

	const byFloor = new Map<number, SignalledRoom[]>();
	for (const room of rooms) {
		if (skipCodes.has(room.roomCode)) continue;
		const signal = inferRoomSignal(room, floorCount);
		if (!signal) continue;
		const bucket = byFloor.get(signal.floor) ?? [];
		bucket.push({ code: room.roomCode, signal });
		byFloor.set(signal.floor, bucket);
	}

	for (const [floor, bucket] of byFloor) {
		const positions = layoutFloor(bucket, polygon);
		for (const { code, signal } of bucket) {
			const placed = positions.get(code);
			if (!placed) continue;
			result.set(code, {
				floor,
				posX: placed.x,
				posY: placed.y,
				confidence: signal.confidence,
				reason: `${signal.reason}. Position is a corridor estimate (${placed.basis}), not a surveyed location.`
			});
		}
	}

	return result;
}

/**
 * Single-room convenience wrapper. Without sibling rooms there is nothing to
 * space against, so the room lands mid-corridor for its parity.
 */
export function inferRoomPlacement(
	room: RoomPlacementInput,
	polygon: LocalPolygonData,
	floorCount: number
): InferredPlacement | null {
	return inferBuildingPlacements([room], polygon, floorCount).get(room.roomCode) ?? null;
}

/** Highest floor implied by a set of room codes, or null if none say. */
export function maxInferredFloor(rooms: RoomPlacementInput[] | string[]): number | null {
	let max: number | null = null;
	for (const entry of rooms) {
		const input = typeof entry === 'string' ? { roomCode: entry } : entry;
		const signal = inferRoomSignal(input);
		if (!signal) continue;
		if (max === null || signal.floor > max) max = signal.floor;
	}
	return max;
}
