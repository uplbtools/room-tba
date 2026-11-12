<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import MapEntityPin from '#lib/components/map/MapEntityPin.svelte';
	import PinGlyph from '#lib/components/map/PinGlyph.svelte';
	// import { buildingMatchesTypeFilter } from '#lib/constants/content/categories/building.js';
	import { getMapBuildingsData } from '#lib/functions/buildings.remote.js';
	import { getMapStore, getSearchInfo } from '#lib/utils/context.js';
	import { hasLocation } from '#lib/utils/map/marker.js';

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
		return async () => {
			await goto(resolve(`map/buildings/${building.id}`));
			map.centerMarker([building.lon, building.lat]);
		};
	}
</script>

{#each filteredBuildings as building (building.id)}
	{#if hasLocation(building) && (map.withinZoom(zoomLevel) || searchInfo.isActiveMarker(building.buildingName, 'building'))}
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
		<MapEntityPin
			label={building.buildingName}
			active={searchInfo.isActiveMarker(building.buildingName, 'building')}
			dimmed={searchInfo.hasActiveResult()}
			onclick={handleMarkerClick(building)}
			lngLat={[building.lon, building.lat]}
			labelVisible={map.withinZoom(18)}
		>
			<PinGlyph
				name="building"
				size={// // editable={canDragPin(editKey)}
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
				20}
			/>
		</MapEntityPin>
		<!-- {/key} -->
	{/if}
{/each}
