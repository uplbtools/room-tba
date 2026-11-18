<script lang="ts">
	import { page } from '$app/state';
	import { CircleLayer, GeoJSON, LineLayer } from 'svelte-maplibre';
	import { MAKILING_TRAIL_COLOR } from '#lib/constants/map/makiling-trail.js';
	import { getTrail, getTrailStops, resolveTrailTarget } from '#lib/utils/makiling-trail.js';

	const target = $derived(resolveTrailTarget(page.url.searchParams.get('trail')));
	const trail = $derived(getTrail(target.trailId));
</script>

{#if page.route.id === '/(app)/map/trail'}
	<GeoJSON
		id="makiling-trail-line"
		data={{
			type: 'Feature',
			properties: {},
			geometry: { type: 'LineString', coordinates: trail.path.map(([lon, lat]) => [lon, lat]) }
		}}
	>
		<LineLayer
			layout={{ 'line-cap': 'round', 'line-join': 'round' }}
			paint={{ 'line-color': '#ffffff', 'line-width': 8 }}
		/>
		<LineLayer
			layout={{ 'line-cap': 'round', 'line-join': 'round' }}
			paint={{ 'line-color': MAKILING_TRAIL_COLOR, 'line-width': 4 }}
		/>
	</GeoJSON>
	<GeoJSON
		id="makiling-trail-stops"
		data={{
			type: 'FeatureCollection',
			features: getTrailStops(trail.id).map((stop) => ({
				type: 'Feature',
				properties: { open: stop.id === target.stopId },
				geometry: { type: 'Point', coordinates: [stop.lon, stop.lat] }
			}))
		}}
	>
		<CircleLayer
			paint={{
				'circle-radius': ['case', ['get', 'open'], 9, 5],
				'circle-color': '#ffffff',
				'circle-stroke-color': MAKILING_TRAIL_COLOR,
				'circle-stroke-width': 3
			}}
		/>
	</GeoJSON>
{/if}
