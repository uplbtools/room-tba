<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import MapEntityPin from '$lib/components/map/MapEntityPin.svelte';
	import PinGlyph from '$lib/components/map/PinGlyph.svelte';
	import { isPlaceLandmark } from '$lib/constants/content/categories/place';
	import { getMapPlacesData } from '$lib/functions/places.remote';
	import { getMapStore, getSearchInfo } from '$lib/utils/context';
	import { Marker } from 'svelte-maplibre';

	interface Props {
		placePinFilter: 'all' | 'landmark' | 'establishment' | 'none';
		zoomLevel: number;
	}

	const { placePinFilter, zoomLevel }: Props = $props();
	const map = getMapStore();
	const searchInfo = getSearchInfo();
	const places = await getMapPlacesData();

	const filteredPlaces = $derived.by(() => {
		// if (!loaded || placePinFilter === 'none') return [];
		return places.filter(
			(place) =>
				place.lat != null &&
				place.lon != null &&
				(placePinFilter === 'all' ||
					(placePinFilter === 'landmark') === isPlaceLandmark(place.category))
		);
	});

	function handleMarkerClick(place: (typeof filteredPlaces)[number]) {
		return async () => {
			await goto(resolve(`/map/places/${place.id}`));
			if (place.lon && place.lat) {
				map.centerMarker([place.lon, place.lat]);
			}
		};
	}
</script>

{#if map.withinZoom(zoomLevel)}
	{#each filteredPlaces as place (`place:${place.id}`)}
		<!-- /* poiPinsVisible || sponsoredPlacePins.has(place.name) || */ /* searchInfo.category === 'place' && searchInfo.inputValue === place.name */ -->
		{#if place.lon && place.lat}
			<!-- {@const centralHoverPreview = shouldShowEntityHoverPreview()}
			{@const previewSuppressed =
				centralHoverPreview && isPlaceHoverPreview(entityHoverPreviewStore.entity, place.id)}
			{@const pinSponsorId = sponsoredPlacePins.get(place.name)} -->
			<Marker lngLat={[place.lon, place.lat]} onclick={handleMarkerClick(place)}>
				<MapEntityPin
					label={place.name}
					tone={isPlaceLandmark(place.category) ? 'landmark' : 'establishment'}
					active={searchInfo.isActiveMarker(place.name, 'place')}
					dimmed={searchInfo.hasActiveResult()}
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
