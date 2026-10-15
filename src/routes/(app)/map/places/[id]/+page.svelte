<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { navigating } from '$app/state';
	import InfoPanel from '#lib/components/controls/InfoPanel.svelte';
	import { getPlaceById } from '#lib/functions/places.remote.js';
	import { getMapStore, getSearchInfo } from '#lib/utils/context.js';
	import { onMount } from 'svelte';
	import PlaceResult from './PlaceResult.svelte';
	// import { onMount, untrack } from 'svelte';

	const { params } = $props();
	const searchInfo = getSearchInfo();
	const map = getMapStore();

	const place = $derived(getPlaceById(params.id));

	afterNavigate(syncSearchView);

	onMount(async () => {
		if (navigating.type) return;
		await syncSearchView();
	});

	async function syncSearchView() {
		const placeRes = await place;
		if (placeRes.lon && placeRes.lat) {
			map.centerMarker([placeRes.lon, placeRes.lat]);
		}
		searchInfo.updateQuery({
			category: 'place',
			type: 'result',
			value: placeRes.name
		});
	}
</script>

<svelte:head>
	<title>{(await place).name} | Room TBA Place</title>
</svelte:head>

<InfoPanel>
	<svelte:boundary>
		{#snippet failed()}
			failed to load
		{/snippet}
		{#snippet pending()}
			Loading...
		{/snippet}
		<PlaceResult place={await place} />
	</svelte:boundary>
</InfoPanel>
