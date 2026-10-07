<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { navigating } from '$app/state';
	import { getBuildingById } from '$lib/functions/buildings.remote';
	import { getMapStore, getSearchInfo } from '$lib/utils/context';
	import { onMount } from 'svelte';
	import BuildingResult from './BuildingResult.svelte';
	import InfoPanel from '$lib/components/controls/InfoPanel.svelte';

	const { params } = $props();
	const searchInfo = getSearchInfo();
	const map = getMapStore();

	const building = $derived(getBuildingById(params.id));

	afterNavigate(syncSearchView);

	onMount(async () => {
		if (navigating.type) return;
		await syncSearchView();
	});

	async function syncSearchView() {
		const buildingRes = await building;
		if (buildingRes.lon && buildingRes.lat) {
			map.centerMarker([buildingRes.lon, buildingRes.lat]);
		}
		searchInfo.updateQuery({
			category: 'building',
			type: 'result',
			value: buildingRes.buildingName
		});
	}
</script>

<svelte:head>
	<title>{(await building).buildingName} | Room TBA Building</title>
</svelte:head>

<InfoPanel>
	<svelte:boundary>
		{#snippet failed()}
			failed to load
		{/snippet}
		{#snippet pending()}
			Loading...
		{/snippet}
		<BuildingResult building={await building} />
	</svelte:boundary>
</InfoPanel>
