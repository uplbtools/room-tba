import { getLocalRoomByCode, getJSONFetch } from '#lib/utils/local/data/utils.js';

/**
 * Building ids for the rooms in the user's active planner plan. Powers the
 * "My classes" map highlight: planner sections carry room codes; each code
 * resolves to its building via PGlite first, then the rooms API — the same
 * room→building path ScheduleRouteStore uses for schedule routing.
 */

export default class PlannerBuildingsStore {
	buildingIds = $state<Set<number>>(new Set());
	private _cache = new Map<string, number | null>();
	private _requestId = 0;

	load = async (roomCodes: string[]) => {
		const requestId = ++this._requestId;
		const ids = await Promise.all(roomCodes.map((code) => this.#resolveBuildingId(code)));
		// Ignore stale responses if a newer load started meanwhile.
		if (requestId !== this._requestId) return;
		this.buildingIds = new Set(ids.filter((id): id is number => id !== null));
	};

	#resolveBuildingId = async (roomCode: string): Promise<number | null> => {
		const cached = this._cache.get(roomCode);
		if (cached !== undefined) return cached;
		let buildingId: number | null = null;
		try {
			const local = await getLocalRoomByCode(roomCode);
			const room =
				local ??
				(
					await getJSONFetch<{ data: { buildingId: number | null } | null }>(
						`/api/rooms?code=${encodeURIComponent(roomCode)}`
					)
				).data;
			buildingId = room?.buildingId ?? null;
		} catch (e) {
			console.error(`Failed to resolve building for room ${roomCode}:`, e);
			// Do not cache failures — a later load (e.g. back online) can retry.
			return null;
		}
		this._cache.set(roomCode, buildingId);
		return buildingId;
	};
}
