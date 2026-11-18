<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import { onMount } from 'svelte';
	import InfoPanel from '#lib/components/new/InfoPanel.svelte';
	import { getMapStore } from '#lib/utils/context.js';
	import { findTrailStop, getTrail, resolveTrailTarget } from '#lib/utils/makiling-trail.js';
	import TrailPanel from './TrailPanel.svelte';

	const map = getMapStore();
	const target = $derived(resolveTrailTarget(page.url.searchParams.get('trail')));

	afterNavigate(moveMap);

	onMount(() => {
		if (!navigating.type) moveMap();
	});

	function moveMap() {
		const stop = findTrailStop(target.stopId);
		if (stop) {
			map.centerMarker([stop.lon, stop.lat], 16);
			return;
		}
		const { path } = getTrail(target.trailId);
		const lons = path.map((vertex) => vertex[0]);
		const lats = path.map((vertex) => vertex[1]);
		map.fitBounds([
			[Math.min(...lons), Math.min(...lats)],
			[Math.max(...lons), Math.max(...lats)]
		]);
	}
</script>

<InfoPanel>
	<TrailPanel trailId={target.trailId} stopId={target.stopId} />
</InfoPanel>
