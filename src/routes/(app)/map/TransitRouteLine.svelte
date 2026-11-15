<script lang="ts">
	import { page } from '$app/state';
	import { CircleLayer, GeoJSON, LineLayer } from 'svelte-maplibre';
	import { getTransitRoute } from '#lib/functions/transit.remote.js';
</script>

{#if page.route.id === '/(app)/map/transit/[route]' && page.params.route}
	<svelte:boundary>
		{#snippet failed()}{/snippet}
		{@const route = await getTransitRoute(page.params.route)}
		{#if route.geometry.line}
			<GeoJSON id="transit-route-line" data={route.geometry.line}>
				<LineLayer
					layout={{ 'line-cap': 'round', 'line-join': 'round' }}
					paint={{
						'line-color': route.color,
						'line-width': 5,
						...(route.geometry.source === 'stops-only' ? { 'line-dasharray': [1.5, 1.5] } : {})
					}}
				/>
			</GeoJSON>
		{/if}
		<GeoJSON
			id="transit-route-stops"
			data={{
				type: 'FeatureCollection',
				features: route.stops.map((stop) => ({
					type: 'Feature',
					properties: { name: stop.name },
					geometry: { type: 'Point', coordinates: [stop.lon, stop.lat] }
				}))
			}}
		>
			<CircleLayer
				paint={{
					'circle-radius': 5,
					'circle-color': '#ffffff',
					'circle-stroke-color': route.color,
					'circle-stroke-width': 3
				}}
			/>
		</GeoJSON>
	</svelte:boundary>
{/if}
