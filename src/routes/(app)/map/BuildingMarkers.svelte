<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import MapEntityPin from '$lib/components/map/MapEntityPin.svelte';
	import PinGlyph from '$lib/components/map/PinGlyph.svelte';
	// import { buildingMatchesTypeFilter } from '$lib/constants/content/categories/building';
	import { getMapBuildingsData } from '$lib/functions/buildings.remote';
	import { getMapStore, getSearchInfo } from '$lib/utils/context';
	import { Marker } from 'svelte-maplibre';

	interface Props {
		showBuildingPins: boolean;
		zoomLevel: number;
	}

	const { showBuildingPins, zoomLevel }: Props = $props();
	const map = getMapStore();
	const searchInfo = getSearchInfo();
	const buildings = await getMapBuildingsData();

	const filteredBuildings = $derived.by(() => {
		return buildings;
		/**
		 * last implemented feature for filtered buildings: building matches filter
		 */
		// if (!loaded || !showBuildingPins) return [];
		// return buildings.filter((building) => true);
		// buildingMatchesTypeFilter(
		// 	building,
		// 	buildingTypeFilter.value,
		// 	classVenuesStore.buildingIdsWithClasses
		// )
	});

	function handleMarkerClick(building: (typeof filteredBuildings)[number]) {
		return () => {
			map.centerMarker([building.lon, building.lat]);
			goto(resolve(`/map/buildings/${building.id}`));
		};
	}

	/* function handleMarkerClick(building: Building) {
		return () => {
			// if (eventPlacementStore.active) return;
			// if (isMapEditEnabled() && selectedEditKey !== null) return;
			if (building.buildingName === searchInfo.inputValue) return;
			goto(resolve(`/map/buildings/${slugifySegment(building.buildingName)}`));
			// sidePanelStore.openPanel({
			// 	type: 'search-result',
			// 	component: BuildingResult
			// });
			map.centerMarker([building.lon, building.lat]);
		};
	} */
</script>

{#if map.withinZoom(zoomLevel) && showBuildingPins}
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
					active={searchInfo.isActiveMarker(building.buildingName, 'building')}
					dimmed={searchInfo.hasActiveResult()}
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
{/if}
