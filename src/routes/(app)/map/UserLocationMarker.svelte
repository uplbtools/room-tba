<script lang="ts">
	import { getUserLocation } from '#lib/utils/context.js';
	import type { Marker as MapLibreMarker } from 'maplibre-gl';
	import { Marker } from 'svelte-maplibre';
	const userLocation = getUserLocation();

	let marker = $state<MapLibreMarker | undefined>();

	$effect(() => {
		marker?.setRotationAlignment('map');
	});
</script>

{#if userLocation.coords}
	<Marker lngLat={userLocation.coords} bind:marker>
		<div class="user-location-dot">
			{#if userLocation.heading !== null}
				<span
					class="user-location-cone"
					style:--cone-rotation="{userLocation.heading}deg"
					aria-hidden="true"
				></span>
			{/if}
			<span class="user-location-pin"></span>
		</div>
	</Marker>
{/if}

<style>
	.user-location-dot {
		position: relative;
		z-index: 70;
		display: grid;
		place-items: center;
		width: 1rem;
		height: 1rem;
	}

	.user-location-pin {
		position: relative;
		width: 1rem;
		height: 1rem;
		background-color: #4285f4;
		border: 3px solid white;
		border-radius: 50%;
		box-sizing: border-box;
		box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
	}

	.user-location-cone {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 4.5rem;
		height: 4.5rem;
		border-radius: 50%;
		background: conic-gradient(from -35deg, rgb(66 133 244 / 0.5) 0deg 70deg, transparent 70deg);
		mask-image: radial-gradient(circle, #000 15%, transparent 70%);
		pointer-events: none;
		translate: -50% -50%;
		rotate: var(--cone-rotation, 0deg);
		transition: rotate 200ms linear;
	}

	@media (prefers-reduced-motion: reduce) {
		.user-location-cone {
			transition: none;
		}
	}
</style>
