<script>
	import { userLocation } from '$lib/stores.svelte';
	import { Marker } from 'svelte-maplibre';
</script>

{#if userLocation.coords}
	<Marker lngLat={userLocation.coords}>
		<div class="user-location-pin"></div>
	</Marker>
{/if}

<style>
	.user-location-pin {
		width: 1rem;
		height: 1rem;
		background-color: #4285f4;
		border: 3px solid white;
		border-radius: 50%;
		box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
		position: relative;
		z-index: 70;
	}
</style>
