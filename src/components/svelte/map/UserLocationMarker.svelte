<script lang="ts">
  import { Marker } from "svelte-maplibre";
  import type maplibregl from "maplibre-gl";
  import { directionsStore, locationStore } from "@lib/store.svelte";

  type Props = { lngLat: [number, number] };

  let { lngLat }: Props = $props();

  let marker = $state<maplibregl.Marker | undefined>();

  // Rotate with the map, not the screen: the cone and the navigation arrow
  // take a compass bearing, so turning the map has to turn them too.
  $effect(() => {
    marker?.setRotationAlignment("map");
  });

  const heading = $derived(locationStore.heading);
</script>

<Marker {lngLat} bind:marker>
  {#if directionsStore.navigating}
    <!-- Heading arrow while navigating (#966); falls back to the plain dot
         when the device reports no heading. -->
    <div
      class="user-location-puck"
      class:user-location-puck--heading={heading !== null}
      style:--puck-rotation="{heading ?? 0}deg"
    ></div>
  {:else}
    <!-- Blue dot; the accuracy halo is a map layer drawn in Map.svelte. A
         cone shows which way the phone points once a compass reports. -->
    <div class="user-location-dot">
      {#if heading !== null}
        <span
          class="user-location-cone"
          style:--cone-rotation="{heading}deg"
          aria-hidden="true"
        ></span>
      {/if}
      <span class="user-location-pin"></span>
    </div>
  {/if}
</Marker>

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

  /* A 70° wedge fading out from the dot, pointing up at 0° and turned to
     the compass heading. */
  .user-location-cone {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 4.5rem;
    height: 4.5rem;
    border-radius: 50%;
    background: conic-gradient(
      from -35deg,
      rgb(66 133 244 / 0.5) 0deg 70deg,
      transparent 70deg
    );
    mask-image: radial-gradient(circle, #000 15%, transparent 70%);
    pointer-events: none;
    translate: -50% -50%;
    rotate: var(--cone-rotation, 0deg);
    transition: rotate 200ms linear;
  }

  /* Navigation puck (#966): a white disc with a heading arrow, GMaps-style.
     Without a heading the arrow is hidden and only the disc shows, so the
     puck never points somewhere the device did not actually report. */
  .user-location-puck {
    position: relative;
    z-index: 70;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 6px rgb(0 0 0 / 0.35);
  }

  .user-location-puck::before {
    content: "";
    position: absolute;
    inset: 0;
    margin: auto;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    background: #4285f4;
  }

  .user-location-puck--heading::before {
    /* Arrowhead pointing along the reported bearing. */
    width: 0;
    height: 0;
    border-right: 0.4375rem solid transparent;
    border-bottom: 0.75rem solid #4285f4;
    border-left: 0.4375rem solid transparent;
    border-radius: 0;
    background: none;
    rotate: var(--puck-rotation, 0deg);
    transition: rotate 300ms linear;
  }

  @media (prefers-reduced-motion: reduce) {
    .user-location-cone,
    .user-location-puck--heading::before {
      transition: none;
    }
  }
</style>
