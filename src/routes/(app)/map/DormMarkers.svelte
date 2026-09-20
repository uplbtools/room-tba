<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import DormResult from '$lib/components/controls/DormResult.svelte';
	import MapEntityPin from '$lib/components/map/MapEntityPin.svelte';
	import PinGlyph from '$lib/components/map/PinGlyph.svelte';
	import { dormMatchesTypeFilter } from '$lib/constants/content/categories/building';
	import { getAllDorms } from '$lib/functions/dorms.remote';
	// import { buildingTypeFilter, map, queryStore, sidePanelStore } from '$lib/stores.svelte';
	import { getAppData, getMapStore } from '$lib/utils/context';
	// import { withinMapZoom } from '$lib/utils/map/navigate';
	import { slugifySegment } from '$lib/utils/site';
	import type { DormData } from '$lib/utils/types';
	import { Marker } from 'svelte-maplibre';

	interface Props {
		showDormPins: boolean;
		zoomLevel: number;
	}

	const { showDormPins, zoomLevel }: Props = $props();

	const map = await getMapStore();
	const dorms = await getAllDorms();

	const filteredDorms = $derived.by(() => {
		return dorms;
		// if (!loaded || !showDormPins) return [];
		// return dorms.filter((dorm) => dormMatchesTypeFilter(dorm, buildingTypeFilter.value));
	});

	function handleMarkerClick(dorm: DormData) {
		return () => {
			goto(resolve(`/map/dorms/${slugifySegment(dorm.dormName)}-${dorm.id}`));
			if (dorm.lon && dorm.lat) {
				map.centerMarker([dorm.lon, dorm.lat]);
			}
		};
	}
	// function handleMarkerClick(dorm: DormData) {
	// 	return () => {
	// 		// if (eventPlacementStore.active) return;
	// 		// if (isMapEditEnabled() && selectedEditKey !== null) return;
	// 		// if (dorm.dormName === queryStore.inputValue) return;
	// 		// queryStore.updateQuery({
	// 		// 	category: 'dorm',
	// 		// 	type: 'result',
	// 		// 	value: dorm.dormName,
	// 		// 	id: dorm.id
	// 		// });
	// 		// queryStore.inputValue = dorm.dormName;
	// 		// sidePanelStore.openPanel({
	// 		// 	type: 'search-result',
	// 		// 	component: DormResult
	// 		// });
	// 		goto(resolve(`/map/dorms/${slugifySegment(dorm.dormName)}-${dorm.id}`));
	// 		if (dorm.lon && dorm.lat) {
	// 			map.centerMarker([dorm.lon, dorm.lat]);
	// 		}
	// 	};
	// }
</script>

{#if map.withinZoom(zoomLevel)}
	{#each filteredDorms as dorm (`dorm:${dorm.id}`)}
		{#if dorm.lat && dorm.lon}
			<!-- {@const editKey = dormEditKey(dorm.id)}
			{@const position = getEditablePosition(editKey, {
				lat: dorm.lat,
				lon: dorm.lon,
				version: getLoadedVersion(dorm.version)
			})}
			{@const centralHoverPreview = shouldShowEntityHoverPreview()}
			{@const previewSuppressed =
				centralHoverPreview && isDormHoverPreview(entityHoverPreviewStore.entity, dorm.id)}
			{#key `${editKey}:${canDragPin(editKey)}`} -->
			<Marker
				lngLat={[dorm.lon, dorm.lat]}
				onclick={handleMarkerClick(dorm)}
				// draggable={canDragPin(editKey)}
			>
				<MapEntityPin
					label={dorm.dormName}
					tone={dorm.isUpManaged ? 'dorm' : 'privateDorm'}
					// active={queryStore.isActiveMarker(dorm.dormName, 'dorm')}
					// dimmed={queryStore.hasActiveMarker()}
					// eventLinked={isDormEventLinked(dorm.id)}
					// editable={canDragPin(editKey)}
					// editing={selectedEditKey === editKey}
					// hovered={hoveredEditKey === editKey}
					// saveState={savingEditKey === editKey
					// 	? 'saving'
					// 	: savedEditKey === editKey
					// 		? 'saved'
					// 		: failedEditKey === editKey
					// 			? 'failed'
					// 			: 'idle'}
				>
					<PinGlyph name="dorm" size={18} />
				</MapEntityPin>
			</Marker>
			<!-- {/key} -->
		{/if}
	{/each}
{/if}
