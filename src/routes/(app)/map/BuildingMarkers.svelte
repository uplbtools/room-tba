<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import BuildingResult from '$lib/components/controls/BuildingResult.svelte';
	import MapEntityPin from '$lib/components/map/MapEntityPin.svelte';
	import PinGlyph from '$lib/components/map/PinGlyph.svelte';
	import { buildingMatchesTypeFilter } from '$lib/constants/content/categories/building';
	import {
		buildingTypeFilter,
		classVenuesStore,
		map,
		queryStore,
		sidePanelStore
	} from '$lib/stores.svelte';
	import { getAppData } from '$lib/utils/context';
	import { slugifySegment } from '$lib/utils/site';
	import type { BuildingData } from '$lib/utils/types';
	import { Marker } from 'svelte-maplibre';

	interface Props {
		showBuildingPins: boolean;
	}

	const { showBuildingPins }: Props = $props();

	const data = getAppData();
	const { buildings, loaded } = $derived(data());
	const filteredBuildings = $derived.by(() => {
		if (!loaded || !showBuildingPins) return [];
		return buildings.filter((building) =>
			buildingMatchesTypeFilter(
				building,
				buildingTypeFilter.value,
				classVenuesStore.buildingIdsWithClasses
			)
		);
	});

	function handleMarkerClick(building: BuildingData) {
		return () => {
			// if (eventPlacementStore.active) return;
			// if (isMapEditEnabled() && selectedEditKey !== null) return;
			if (building.buildingName === queryStore.inputValue) return;
			queryStore.updateQuery({
				category: 'building',
				type: 'result',
				value: building.buildingName
			});
			queryStore.inputValue = building.buildingName;
			goto(resolve(`/map/buildings/${slugifySegment(building.buildingName)}`));
			sidePanelStore.openPanel({
				type: 'search-result',
				component: BuildingResult
			});
			map.centerMarker([building.lon, building.lat]);
		};
	}
</script>

{#each filteredBuildings as building}
	{#if building.lat && building.lon}
		<!-- {@const editKey = buildingEditKey(building.id)}
		{@const position = getEditablePosition(editKey, {
			lat: building.lat,
			lon: building.lon,
			version: getLoadedVersion(building.version)
		})}
		{@const centralHoverPreview = shouldShowEntityHoverPreview()}
		{@const previewSuppressed =
			centralHoverPreview && isBuildingHoverPreview(entityHoverPreviewStore.entity, building.id)} -->
		<!-- {#key `${editKey}:${canDragPin(editKey)}`} -->
		<Marker
			lngLat={[building.lon, building.lat]}
			// draggable={canDragPin(editKey)}
			onclick={handleMarkerClick(building)}
		>
			<MapEntityPin
				label={building.buildingName}
				// active={!isInactiveMarker(building.buildingName)}
				// // editable={canDragPin(editKey)}
				// editing={selectedEditKey === editKey}
				// dimmed={hasActiveMarker()}
				// eventLinked={isBuildingEventLinked(building.id)}
				// hovered={hoveredEditKey === editKey}
				// saveState={savingEditKey === editKey
				// 	? 'saving'
				// 	: savedEditKey === editKey
				// 		? 'saved'
				// 		: failedEditKey === editKey
				// 			? 'failed'
				// 			: 'idle'}
			>
				<PinGlyph name="building" size={20} />
			</MapEntityPin>
		</Marker>
		<!-- {/key} -->
	{/if}
{/each}
