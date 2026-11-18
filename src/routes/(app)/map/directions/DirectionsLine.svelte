<script lang="ts">
	import { page } from '$app/state';
	import { CircleLayer, GeoJSON, LineLayer } from 'svelte-maplibre';
	import { getJeepRide, getWalkingRoute } from '#lib/functions/directions.remote.js';
	import { getUserLocation } from '#lib/utils/context.js';
	import { routeLegs, usesJeep } from './legs.js';
	import { directionsRequest } from './point.js';

	const userLocation = getUserLocation();
	const request = $derived(
		page.route.id === '/(app)/map/directions'
			? directionsRequest(page.url.searchParams, userLocation.coords)
			: null
	);
</script>

{#if request}
	<svelte:boundary>
		{#snippet failed()}{/snippet}
		{@const { from, to, plan } = await getWalkingRoute(request)}
		{#if plan.status === 'ok'}
			{@const jeep = await getJeepRide(request)}
			<GeoJSON
				id="directions-route"
				data={{
					type: 'FeatureCollection',
					features: [
						...routeLegs(
							from,
							to,
							plan.route.coordinates,
							usesJeep(page.url.searchParams, jeep) ? jeep : null
						).map(({ color, coordinates }) => ({
							type: 'Feature' as const,
							properties: { color },
							geometry: { type: 'LineString' as const, coordinates }
						})),
						...[from, to].map((end, i) => ({
							type: 'Feature' as const,
							properties: { end: i === 1 },
							geometry: { type: 'Point' as const, coordinates: [end.lon, end.lat] }
						}))
					]
				}}
			>
				<LineLayer
					filter={['==', '$type', 'LineString']}
					layout={{ 'line-cap': 'round', 'line-join': 'round' }}
					paint={{ 'line-color': ['get', 'color'], 'line-width': 5 }}
				/>
				<CircleLayer
					filter={['==', '$type', 'Point']}
					paint={{
						'circle-radius': 7,
						'circle-color': ['case', ['get', 'end'], '#dc2626', '#ffffff'],
						'circle-stroke-color': ['case', ['get', 'end'], '#ffffff', '#2563eb'],
						'circle-stroke-width': 3
					}}
				/>
			</GeoJSON>
		{/if}
	</svelte:boundary>
{/if}
