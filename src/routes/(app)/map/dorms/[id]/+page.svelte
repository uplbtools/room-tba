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

	const dorm = $derived(getDormById(params.id));

	afterNavigate(syncSearchView);

	onMount(async () => {
		if (navigating.type) return;
		await syncSearchView();
	});

	async function syncSearchView() {
		const dormRes = await dorm;
		if (dormRes.lon && dormRes.lat) {
			map.centerMarker([dormRes.lon, dormRes.lat]);
		}
		searchInfo.updateQuery({
			category: 'dorm',
			type: 'result',
			value: dormRes.dormName
		});
	}
</script>

<svelte:head>
	<title>{(await dorm).dormName} | Room TBA Dorm</title>
</svelte:head>
