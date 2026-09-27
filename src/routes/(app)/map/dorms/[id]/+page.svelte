<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { navigating } from '$app/state';
	import { getDormById } from '$lib/functions/dorms.remote.js';
	import { getMapStore, getSearchInfo } from '$lib/utils/context';
	import { onMount, untrack } from 'svelte';
	// import { onMount, untrack } from 'svelte';

	const { params } = $props();
	const searchInfo = getSearchInfo();
	const map = getMapStore();

	const data = $derived(await getDormById(params.id));

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
			category: 'dorm',
			type: 'result',
			value: data.dormName
		});
	}
</script>
