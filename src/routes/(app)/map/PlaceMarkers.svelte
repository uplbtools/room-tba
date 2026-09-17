<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import PlaceResult from '$lib/components/controls/PlaceResult.svelte';
	import MapEntityPin from '$lib/components/map/MapEntityPin.svelte';
	import PinGlyph from '$lib/components/map/PinGlyph.svelte';
	import { isPlaceLandmark } from '$lib/constants/content/categories/place';
	import { map, queryStore, sidePanelStore } from '$lib/stores.svelte';
	import { getAppData } from '$lib/utils/context';
	import { withinMapZoom } from '$lib/utils/map/navigate';
	import { slugifySegment } from '$lib/utils/site';
	import type { PlaceData } from '$lib/utils/types';
	import { Marker } from 'svelte-maplibre';

	interface Props {
		placePinFilter: 'all' | 'landmark' | 'establishment' | 'none';
		zoomLevel: number;
	}

	const { placePinFilter, zoomLevel }: Props = $props();

	const data = getAppData();
	const { places, loaded } = $derived(data());
	const filteredPlaces = $derived.by(() => {
		if (!loaded || placePinFilter === 'none') return [];
		return places.filter(
			(place) =>
				place.lat != null &&
				place.lon != null &&
				(placePinFilter === 'all' ||
					(placePinFilter === 'landmark') === isPlaceLandmark(place.category))
		);
	});

	function handleMarkerClick(place: PlaceData) {
		// if (pinSponsorId) trackSponsorClick(pinSponsorId, 'map_pin');
		// handlePlaceMarkerClick(place);
		return () => {
			if (queryStore.category === 'place' && queryStore.inputValue === place.name) {
				sidePanelStore.expand();
				return;
			}
			queryStore.updateQuery({
				category: 'place',
				type: 'result',
				value: place.name,
				id: place.id
			});
			queryStore.inputValue = place.name;
			let subroute: 'landmarks' | 'establishments';
			if (isPlaceLandmark(place.category)) {
				subroute = 'landmarks';
			} else {
				subroute = 'establishments';
			}
			goto(resolve(`/map/${subroute}/${slugifySegment(place.name)}-${place.id}`));
			sidePanelStore.openPanel({
				type: 'search-result',
				component: PlaceResult
			});
			if (place.lon && place.lat) {
				map.centerMarker([place.lon, place.lat]);
			}
		};
	}
</script>

{#if withinMapZoom(zoomLevel)}
	{#each filteredPlaces as place (`place:${place.id}`)}
		<!-- /* poiPinsVisible || sponsoredPlacePins.has(place.name) || */ /* queryStore.category === 'place' && queryStore.inputValue === place.name */ -->
		{#if place.lon && place.lat}
			<!-- {@const centralHoverPreview = shouldShowEntityHoverPreview()}
			{@const previewSuppressed =
				centralHoverPreview && isPlaceHoverPreview(entityHoverPreviewStore.entity, place.id)}
			{@const pinSponsorId = sponsoredPlacePins.get(place.name)} -->
			<Marker lngLat={[place.lon, place.lat]} onclick={handleMarkerClick(place)}>
				<MapEntityPin
					label={place.name}
					tone={isPlaceLandmark(place.category) ? 'landmark' : 'establishment'}
					active={queryStore.isActiveMarker(place.name, 'place')}
					dimmed={queryStore.hasActiveMarker()}
					// active={queryStore.category === 'place' && queryStore.inputValue === place.name}
					// dimmed={hasActiveMarker()}
				>
					{#if isPlaceLandmark(place.category)}
						<PinGlyph name="landmark" size={16} />
					{:else}
						<PinGlyph name="establishment" size={16} />
					{/if}
				</MapEntityPin>
			</Marker>
		{/if}
	{/each}
{/if}
