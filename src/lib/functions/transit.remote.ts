import { command, getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import jeepneyGeometries from '#lib/constants/map/jeepney-geometries.json';
import {
	resolveRouteGeometry,
	withBundledRoutes,
	type StoredRouteGeometry
} from '#lib/constants/map/jeepney-routes.js';
import { clientIp } from '#lib/api/rate-limit.js';
import * as reports from '#lib/services/transit-report.js';
import { getAllJeepneyRoutes } from '#lib/services/transit.js';
import { routeDirections } from '#lib/utils/transit/transit-direction.js';
import {
	enforceReportIpLimit,
	isReportTooFar,
	isUndefinedTableError,
	parseStopKey,
	parseStopKeysParam,
	reportMatchesRoute,
	validateReport
} from '#lib/utils/transit/transit-reports.js';

const geometries = jeepneyGeometries as Record<string, StoredRouteGeometry | undefined>;

/** Every jeepney route, with the bundled routes added. */
export const getTransitRoutes = query(async () => {
	const routes = await getAllJeepneyRoutes().catch((err) => {
		console.error('Transit routes query failed:', err);
		return [];
	});
	return withBundledRoutes(routes);
});

/** One transit route by id, with its geometry. Responds 404 when it does not exist. */
export const getTransitRoute = query(v.string(), async (id) => {
	const route = (await getTransitRoutes()).find((r) => r.id === id);
	if (!route) error(404, 'Not found');
	return { ...route, geometry: resolveRouteGeometry(route, geometries) };
});

/** The last hour of reports at these stops, with the server clock they are relative to. */
export const getStopReports = query(v.array(v.string()), async (stopKeys) => {
	const keys = parseStopKeysParam(stopKeys);
	if (!keys) error(400, 'Invalid stop.');
	const now = Date.now();
	try {
		return { now, reports: await reports.getStopReports(keys) };
	} catch (err) {
		if (isUndefinedTableError(err)) return { now, reports: [] };
		throw err;
	}
});

/** When classes in nearby buildings let out, for one stop. */
export const getStopPeaks = query(v.string(), async (stopKey) => {
	const stop = parseStopKey(stopKey);
	if (!stop) error(400, 'Invalid stop.');
	return reports.getStopPeaks(stop);
});

/** An anonymous write, so every check of /api/transit/reports applies here too. */
export const reportJeep = command('unchecked', async (body: unknown) => {
	if (enforceReportIpLimit(clientIp(getRequestEvent().request))) {
		return { ok: false, error: "That's a lot of reports at once. Try again in a few minutes." };
	}
	const validated = validateReport(body);
	if (!validated.ok) return { ok: false, error: validated.error };
	const report = validated.value;
	if (isReportTooFar(report.stopKey, report.location)) {
		return { ok: false, error: 'You seem to be away from this stop. Report from the stop.' };
	}
	const route = (await getTransitRoutes()).find((r) => r.id === report.routeId);
	if (!route || !reportMatchesRoute(route, routeDirections(route.id) !== null, report)) {
		return { ok: false, error: "That stop isn't on this route." };
	}
	try {
		if ((await reports.recordJeepReport(report)) === 'reject') {
			return { ok: false, error: 'You just reported this jeep. Try again in a few minutes.' };
		}
	} catch (err) {
		console.error('[transit-reports] write failed:', err);
		return { ok: false, error: 'Reports are unavailable right now.' };
	}
	return { ok: true, error: null };
});
