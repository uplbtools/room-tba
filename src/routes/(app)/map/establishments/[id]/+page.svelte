<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { navigating } from '$app/state';
	import { getPlaceById } from '$lib/functions/places.remote.js';
	import { getMapStore, getSearchInfo } from '$lib/utils/context';
	import { onMount, untrack } from 'svelte';
	// import { onMount, untrack } from 'svelte';

	const { params } = $props();
	const searchInfo = getSearchInfo();
	const map = getMapStore();

	const data = $derived(await getPlaceById(params.id));

	afterNavigate(resyncSearchInfo);

	onMount(() => {
		if (navigating.type == null && data.lon && data.lat) {
			map.init({
				center: [data.lon, data.lat]
			});
			resyncSearchInfo();
		}
	});

	function resyncSearchInfo() {
		searchInfo.updateQuery({
			category: 'place',
			type: 'result',
			value: data.name
		});
	}
</script>
