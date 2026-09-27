<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import MapEntityPin from '$lib/components/map/MapEntityPin.svelte';
	import PinGlyph from '$lib/components/map/PinGlyph.svelte';
	import { dormMatchesTypeFilter } from '$lib/constants/content/categories/building';
	import { getMapDormsData } from '$lib/functions/dorms.remote';
	import { getMapStore, getSearchInfo } from '$lib/utils/context';
	import type { DormData } from '$lib/utils/types';
	import { Marker } from 'svelte-maplibre';
	import type { inspect } from 'util';

	interface Props {
		showDormPins: boolean;
		zoomLevel: number;
	}

	const { showDormPins, zoomLevel }: Props = $props();

	const map = await getMapStore();
	const searchInfo = getSearchInfo();
	const dorms = await getMapDormsData();

	const filteredDorms = $derived.by(() => {
		return dorms;
		// if (!loaded || !showDormPins) return [];
		// return dorms.filter((dorm) => dormMatchesTypeFilter(dorm, buildingTypeFilter.value));
	});

	function handleMarkerClick(dorm: (typeof filteredDorms)[number]) {
		return () => {
			goto(resolve(`/map/dorms/${dorm.id}`));
			if (dorm.lon && dorm.lat) map.centerMarker([dorm.lon, dorm.lat]);
		};
	}

	// $inspect(searchInfo.isActiveMarker());

	// $inspect(searchInfo.isActiveMarker())
	// function handleMarkerClick(dorm: DormData) {
	// 	return () => {
	// 		// if (eventPlacementStore.active) return;
	// 		// if (isMapEditEnabled() && selectedEditKey !== null) return;
	// 		// if (dorm.name === searchInfo.inputValue) return;
	// 		// searchInfo.updateQuery({
	// 		// 	category: 'dorm',
	// 		// 	type: 'result',
	// 		// 	value: dorm.name,
	// 		// 	id: dorm.id
	// 		// });
	// 		// searchInfo.inputValue = dorm.name;
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
					label={dorm.name}
					tone={dorm.isUpManaged ? 'dorm' : 'privateDorm'}
					active={searchInfo.isActiveMarker(dorm.name, 'dorm')}
					dimmed={searchInfo.hasActiveResult()}
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
