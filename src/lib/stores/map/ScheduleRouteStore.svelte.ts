import { ROOM_SCHEDULE_SCOPE_NOTE } from "$lib/amis/room-scheduled-types";
import type { RouteTotals } from "$lib/utils/campus/campus-route";
import type { ClassQueryPage } from "$lib/utils/classes-api";
import { getJSONFetch, getLocalRoomByCode } from "$lib/utils/local/data/utils";
import { orderDayStops } from "$lib/utils/schedule-import/day-stops";
import { matchImportedScheduleRows } from "$lib/utils/schedule-import/match-classes";
import type { ImportedScheduleRow, ScheduleMatchResult, Weekday } from "$lib/utils/schedule-import/types";
import type { ClassMapValue, Room } from "$lib/utils/types";
import { userLocation, plannerStore, termStore, toastStore } from "../index.svelte.js";
import { SCHEDULE_IMPORT_SS_KEY, type ScheduleImportPersisted } from "../store-types";

export default class ScheduleRouteStore {
	importedRows = $state<ImportedScheduleRow[]>([]);
	matches = $state<ScheduleMatchResult[]>([]);
	selectedWeekday = $state<Weekday>('M');
	routedWeekday: Weekday | null = $state(null);
	/** Walking totals for the routed day, from the map's OSRM response (#839). */
	routeTotals: RouteTotals | null = $state(null);
	/** One-shot /today?route=1 deep link: route today's classes on mount (#839). */
	pendingDayRoute = $state(false);
	focusedStopIndex: number | null = $state(null);
	matching = $state(false);
	importError: string | null = $state(null);
	private _roomCoordCache = new Map<string, [number, number] | null>();
	private _hydrated = false;

	scopeNote = ROOM_SCHEDULE_SCOPE_NOTE;

	dayStops = $derived(orderDayStops(this.matches, this.selectedWeekday));

	unresolved = $derived(this.matches.filter((match) => match.unresolvedReason !== null));

	hasImport = $derived(this.importedRows.length > 0);

	init = () => {
		if (this._hydrated || typeof window === 'undefined') return;
		this._hydrated = true;
		try {
			const raw = sessionStorage.getItem(SCHEDULE_IMPORT_SS_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw) as ScheduleImportPersisted;
			if (parsed.selectedWeekday) {
				this.selectedWeekday = parsed.selectedWeekday;
			}
		} catch (e) {
			console.error('Failed to hydrate schedule weekday:', e);
		}
	};

	private persist = () => {
		if (typeof window === 'undefined') return;
		const payload: ScheduleImportPersisted = {
			selectedWeekday: this.selectedWeekday
		};
		sessionStorage.setItem(SCHEDULE_IMPORT_SS_KEY, JSON.stringify(payload));
	};

	private async resolveRoomCoords(roomCode: string): Promise<[number, number] | null> {
		const normalized = roomCode.trim().toUpperCase();
		if (this._roomCoordCache.has(normalized)) {
			return this._roomCoordCache.get(normalized) ?? null;
		}

		let coords: [number, number] | null = null;
		try {
			const localRoom = await getLocalRoomByCode(normalized);
			const room = localRoom
				? localRoom
				: (
						await getJSONFetch<{ data: Room }>(
							`/api/rooms?code=${encodeURIComponent(normalized)}`
						)
					).data;
			const lat = room?.building?.lat;
			const lon = room?.building?.lon;
			if (lat != null && lon != null) {
				coords = [lon, lat];
			}
		} catch (e) {
			console.error(`Failed to resolve room ${normalized}:`, e);
		}

		this._roomCoordCache.set(normalized, coords);
		return coords;
	}

	private async fetchClassesForTerm(termId: number | null): Promise<ClassMapValue[]> {
		const pageSize = 100;
		let cursor: string | null = null;
		const classes: ClassMapValue[] = [];

		while (true) {
			const params = new URLSearchParams({ limit: String(pageSize) });
			if (termId != null) params.set('term_id', String(termId));
			if (cursor) params.set('cursor', cursor);

			const page = await getJSONFetch<ClassQueryPage>(`/api/classes?${params.toString()}`);
			classes.push(...page.rows);
			if (!page.hasMore || !page.nextCursor || page.rows.length === 0) {
				return classes;
			}
			cursor = page.nextCursor;
		}
	}

	rematch = async () => {
		if (this.importedRows.length === 0) {
			this.matches = [];
			return;
		}

		this.matching = true;
		this.importError = null;
		try {
			const classes = await this.fetchClassesForTerm(termStore.activeTermId);
			const uniqueRooms = new Set<string>();
			for (const row of classes) {
				if (row.roomCode) uniqueRooms.add(row.roomCode.trim().toUpperCase());
			}
			await Promise.all([...uniqueRooms].map((code) => this.resolveRoomCoords(code)));

			this.matches = matchImportedScheduleRows(
				this.importedRows,
				classes,
				(roomCode) => this._roomCoordCache.get(roomCode.trim().toUpperCase()) ?? null
			);
		} catch (e) {
			console.error('Schedule match failed:', e);
			this.importError = 'Could not load classes for matching. Try again.';
			this.matches = [];
		} finally {
			this.matching = false;
		}
	};

	/** Load the active planner plan's sections as the routed schedule. */
	importFromPlanner = async () => {
		plannerStore.init();
		const rows: ImportedScheduleRow[] = (plannerStore.activePlan?.sections ?? []).map(
			({ courseCode, section, type, schedule }) => ({
				courseCode,
				section,
				type,
				schedule
			})
		);
		this.importedRows = rows;
		this.importError = null;
		this._roomCoordCache.clear();
		this.clearRoute();
		await this.rematch();
		return rows.length > 0;
	};

	selectWeekday = (weekday: Weekday) => {
		this.selectedWeekday = weekday;
		this.clearRoute();
		this.persist();
	};

	focusStop = (index: number) => {
		this.focusedStopIndex = this.dayStops[index] ? index : null;
	};

	clearRoute = () => {
		this.routedWeekday = null;
		this.routeTotals = null;
		this.focusedStopIndex = null;
		userLocation.clearRouteWaypoints();
	};

	/**
	 * Map.svelte forwards these from the directions fetch; a 2-point
	 * destination route fires the same event, so only a routed day keeps them.
	 */
	setRouteTotals = (totals: RouteTotals | null) => {
		this.routeTotals = this.routedWeekday === null ? null : totals;
	};

	routeDay = (weekday: Weekday = this.selectedWeekday) => {
		this.selectedWeekday = weekday;
		this.routeTotals = null;
		this.persist();
		const stops = orderDayStops(this.matches, weekday);
		const stopCoords = stops
			.map((stop) => stop.coords)
			.filter((coords): coords is [number, number] => coords !== null);

		if (stopCoords.length === 0) {
			this.clearRoute();
			toastStore.show('No routable classes on this day.', 'info');
			return;
		}

		const waypoints: [number, number][] = [];
		if (userLocation.coords) {
			waypoints.push(userLocation.coords);
		}
		waypoints.push(...stopCoords);

		if (waypoints.length < 2) {
			this.clearRoute();
			toastStore.show('Need at least two stops. Enable location or add more classes.', 'error');
			return;
		}

		userLocation.setRouteWaypoints(waypoints);
		this.routedWeekday = weekday;
		toastStore.show(
			`Routing ${stops.length} class stop${stops.length === 1 ? '' : 's'}.`,
			'success'
		);
	};

	clearImport = () => {
		this.importedRows = [];
		this.matches = [];
		this.importError = null;
		this._roomCoordCache.clear();
		this.clearRoute();
		this.persist();
	};
}