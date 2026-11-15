import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import jeepneyGeometries from '#lib/constants/map/jeepney-geometries.json';
import {
	resolveRouteGeometry,
	withBundledRoutes,
	type StoredRouteGeometry
} from '#lib/constants/map/jeepney-routes.js';
import { getAllJeepneyRoutes } from '#lib/services/transit.js';

const geometries = jeepneyGeometries as Record<string, StoredRouteGeometry | undefined>;

export const getTransitRoutes = query(async () => {
	const routes = await getAllJeepneyRoutes().catch((err) => {
		console.error('Transit routes query failed:', err);
		return [];
	});
	return withBundledRoutes(routes);
});

export const getTransitRoute = query(v.string(), async (id) => {
	const route = (await getTransitRoutes()).find((r) => r.id === id);
	if (!route) error(404, 'Not found');
	return { ...route, geometry: resolveRouteGeometry(route, geometries) };
});
