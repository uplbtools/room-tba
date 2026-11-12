<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import MapEntityPin from '#lib/components/map/MapEntityPin.svelte';
	import PinGlyph from '#lib/components/map/PinGlyph.svelte';
	import { getMapDormsData } from '#lib/functions/dorms.remote.js';
	import { getMapStore, getSearchInfo } from '#lib/utils/context.js';
	import { hasLocation } from '#lib/utils/map/marker.ts';

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
		return async () => {
			await goto(resolve(`map/dorms/${dorm.id}`));
			if (dorm.lon && dorm.lat) map.centerMarker([dorm.lon, dorm.lat]);
		};
	}
</script>

{#each filteredDorms as dorm (`dorm:${dorm.id}`)}
	{#if hasLocation(dorm) && (map.withinZoom(zoomLevel) || searchInfo.isActiveMarker(dorm.name, 'dorm'))}
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
			<MapEntityPin
				label={// draggable={canDragPin(editKey)}
				dorm.name}
				tone={dorm.isUpManaged ? 'dorm' : 'privateDorm'}
				active={searchInfo.isActiveMarker(dorm.name, 'dorm')}
				lngLat={[dorm.lon, dorm.lat]}
				onclick={handleMarkerClick(dorm)}
				dimmed={searchInfo.hasActiveResult()}
			>
				<PinGlyph
					name="dorm"
					size={// eventLinked={isDormEventLinked(dorm.id)}
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
					18}
				/>
			</MapEntityPin>
			<!-- {/key} -->
		{/if}
	{/if}
{/each}
