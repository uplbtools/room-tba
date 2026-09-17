<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import DormResult from '$lib/components/controls/DormResult.svelte';
	import MapEntityPin from '$lib/components/map/MapEntityPin.svelte';
	import PinGlyph from '$lib/components/map/PinGlyph.svelte';
	import { dormMatchesTypeFilter } from '$lib/constants/content/categories/building';
	import { buildingTypeFilter, queryStore, sidePanelStore } from '$lib/stores.svelte';
	import { getAppData } from '$lib/utils/context';
	import { withinMapZoom } from '$lib/utils/map/navigate';
	import { slugifySegment } from '$lib/utils/site';
	import { Marker } from 'svelte-maplibre';

	interface Props {
		showDormPins: boolean;
		zoomLevel: number;
	}

	const { showDormPins, zoomLevel }: Props = $props();

	const data = getAppData();
	const { dorms, loaded } = $derived(data());
	const filteredDorms = $derived.by(() => {
		if (!loaded || !showDormPins) return [];
		return dorms.filter((dorm) => dormMatchesTypeFilter(dorm, buildingTypeFilter.value));
	});

	function handleDormMarkerClick(dormName: string, id: number) {
		return () => {
			// if (eventPlacementStore.active) return;
			// if (isMapEditEnabled() && selectedEditKey !== null) return;
			if (dormName === queryStore.inputValue) return;
			queryStore.updateQuery({
				category: 'dorm',
				type: 'result',
				value: dormName,
				id
			});
			queryStore.inputValue = dormName;
			goto(resolve(`/map/dorms/${slugifySegment(dormName)}-${id}`));
			sidePanelStore.openPanel({
				type: 'search-result',
				component: DormResult
			});
		};
	}
</script>

{#if withinMapZoom(zoomLevel)}
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
				onclick={handleDormMarkerClick(dorm.dormName, dorm.id)}
				// draggable={canDragPin(editKey)}
			>
				<MapEntityPin
					label={dorm.dormName}
					tone={dorm.isUpManaged ? 'dorm' : 'privateDorm'}
					active={queryStore.isActiveMarker(dorm.dormName, 'dorm')}
					dimmed={queryStore.hasActiveMarker()}
					// active={!isInactiveMarker(dorm.dormName)}
					// dimmed={hasActiveMarker()}
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
