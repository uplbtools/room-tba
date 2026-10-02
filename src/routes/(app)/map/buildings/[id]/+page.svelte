<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { navigating } from '$app/state';
	import { getBuildingById } from '$lib/functions/buildings.remote';
	import { getMapStore, getSearchInfo } from '$lib/utils/context';
	import { onMount } from 'svelte';
	import BuildingResult from './BuildingResult.svelte';
	// import { onMount, untrack } from 'svelte';

	const { params } = $props();
	const searchInfo = getSearchInfo();
	const map = getMapStore();

	const building = $derived(getBuildingById(params.id));
	afterNavigate(async () => {
		await syncSearchView();
	});

	onMount(async () => {
		if (navigating.type) return;
		await syncSearchView();
	});

	async function syncSearchView() {
		await building;
		if (!building.ready) return;
		if (building.current.lon && building.current.lat) {
			map.centerMarker([building.current.lon, building.current.lat]);
		}
		searchInfo.updateQuery({
			category: 'building',
			type: 'result',
			value: building.current.buildingName
		});
	}

	async function resyncSearchInfo() {
		await building;
		if (building.ready) {
			searchInfo.updateQuery({
				category: 'building',
				type: 'result',
				value: building.current.buildingName
			});
		}
	}
</script>

<!-- {#if building.loading}
	<EntitySkeleton variant="detail" label="Loading building..." />
	<EntitySkeleton variant="rooms" heading="Rooms in the building" label="Loading rooms…" />
{:else if building.error}
	An error occurred
{:else}
	{building.current?.buildingName}
{/if}
<BuildingResult /> -->
<BuildingResult building={await building} />
