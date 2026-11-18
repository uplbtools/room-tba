<script lang="ts">
	import { page } from '$app/state';
	import { CircleLayer, GeoJSON, LineLayer, SymbolLayer } from 'svelte-maplibre';
	import { ROUTE_LINE_CODES } from '#lib/constants/map/jeepney-routes.js';
	import { getTransitRoute } from '#lib/functions/transit.remote.js';
	import { darkenForWhiteText } from '#lib/utils/color-contrast.js';
</script>

{#if page.route.id?.startsWith('/(app)/map/transit/[route]') && page.params.route}
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
				{#if ROUTE_LINE_CODES[route.id]}
					<SymbolLayer
						layout={{
							'symbol-placement': 'line',
							'symbol-spacing': 360,
							'text-field': ROUTE_LINE_CODES[route.id].join('/'),
							'text-font': ['Noto Sans Regular'],
							'text-size': 12,
							'text-letter-spacing': 0.08
						}}
						paint={{
							'text-color': '#ffffff',
							'text-halo-color': darkenForWhiteText(route.color),
							'text-halo-width': 3
						}}
					/>
				{/if}
			</GeoJSON>
		{/if}
		<GeoJSON
			id="transit-route-stops"
			data={{
				type: 'FeatureCollection',
				features: route.stops.map((stop, index) => ({
					type: 'Feature',
					properties: { name: stop.name, open: index === Number(page.params.stop) - 1 },
					geometry: { type: 'Point', coordinates: [stop.lon, stop.lat] }
				}))
			}}
		>
			<CircleLayer
				paint={{
					'circle-radius': ['case', ['get', 'open'], 9, 5],
					'circle-color': '#ffffff',
					'circle-stroke-color': route.color,
					'circle-stroke-width': 3
				}}
			/>
		</GeoJSON>
	</svelte:boundary>
{/if}
