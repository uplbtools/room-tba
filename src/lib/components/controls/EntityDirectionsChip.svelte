<script lang="ts">
	import CornerRightUp from '@lucide/svelte/icons/corner-right-up';
	import MapChromeActionChip from '$lib/components/map-chrome/MapChromeActionChip.svelte';
	import { userLocation } from '$lib/stores.svelte';

	type Props = {
		lat: number;
		lon: number;
		destinationLabel?: string;
		label?: string;
		toolbar?: boolean;
	};

	let { lat, lon, destinationLabel, label = 'Directions', toolbar = true }: Props = $props();

	const ariaLabel = $derived(
		destinationLabel ? `Get directions to ${destinationLabel}` : 'Get directions'
	);

	function openDirections() {
		userLocation.requestLocation();
		userLocation.setDestination([lon, lat]);
	}
</script>

<MapChromeActionChip {toolbar} {ariaLabel} onclick={openDirections}>
	<CornerRightUp size={14} aria-hidden="true" />
	{label}
</MapChromeActionChip>
