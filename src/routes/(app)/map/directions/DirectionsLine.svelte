<script lang="ts">
	import { page } from '$app/state';
	import { CircleLayer, GeoJSON, LineLayer } from 'svelte-maplibre';
	import { getWalkingRoute } from '#lib/functions/directions.remote.js';
	import { getUserLocation } from '#lib/utils/context.js';
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
			<GeoJSON
				id="directions-route"
				data={{
					type: 'FeatureCollection',
					features: [
						{
							type: 'Feature',
							properties: {},
							geometry: {
								type: 'LineString',
								coordinates: [[from.lon, from.lat], ...plan.route.coordinates, [to.lon, to.lat]]
							}
						},
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
					paint={{ 'line-color': '#2563eb', 'line-width': 5 }}
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
