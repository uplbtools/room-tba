<script lang="ts">
  import Box from "@lucide/svelte/icons/box";
  import MapIcon from "@lucide/svelte/icons/map";
  import Satellite from "@lucide/svelte/icons/satellite";
  import { onMount } from "svelte";
  import { THREE_D_PITCH, isMap2DPitch } from "@constants/map-dimension";
  import {
    enterFlatMapDimension,
    enterTiltedMapDimension,
  } from "@lib/map-dimension-layers";
  import {
    getBasemapProvider,
    onBasemapProviderChange,
  } from "@lib/basemap-provider";
  import { mapStore, mapViewStore, terrainStore } from "@lib/store.svelte";

  /**
   * Map type tiles at the top of the Layers sheet, Google Maps style. Default
   * and Satellite pick the basemap; 3D tilts the camera on either one. They
   * replace the 3D and satellite buttons that used to stack on the map edge.
   */

  let pitch = $state(0);
  const tilted = $derived(!isMap2DPitch(pitch));

  // Satellite tiles need a working MapTiler key. Gate on the provider that
  // actually served the basemap: a rejected key (#863) falls back to a
  // keyless basemap, and satellite would 403 the same way.
  let basemapProvider = $state(getBasemapProvider());
  onMount(() => onBasemapProviderChange((next) => (basemapProvider = next)));
  const satelliteAvailable = $derived(basemapProvider === "maptiler");

  $effect(() => {
    const map = mapStore.mapInstance;
    if (!map) return;
    const sync = () => (pitch = map.getPitch());
    sync();
    map.on("pitch", sync);
    return () => map.off("pitch", sync);
  });

  function setSatellite(on: boolean) {
    if (mapViewStore.satellite !== on) mapViewStore.toggleSatellite();
  }

  function toggle3D() {
    const map = mapStore.mapInstance;
    if (!map) return;
    if (isMap2DPitch(map.getPitch())) {
      map.easeTo({ pitch: THREE_D_PITCH, duration: 400 });
      map.once("moveend", () =>
        enterTiltedMapDimension(map, terrainStore.enabled),
      );
      return;
    }
    enterFlatMapDimension(map, terrainStore.enabled);
    // Pitch only: snapping north here would throw away a rotation the user
    // set on purpose. The compass is the control that resets rotation.
    map.easeTo({ pitch: 0, duration: 400 });
  }
</script>

<section class="map-type-picker" aria-labelledby="map-type-heading">
  <h3 id="map-type-heading" class="map-type-picker__heading">Map type</h3>
  <div class="map-type-picker__tiles">
    <button
      type="button"
      class="map-type-tile"
      aria-pressed={!mapViewStore.satellite}
      onclick={() => setSatellite(false)}
    >
      <span class="map-type-tile__swatch map-type-tile__swatch--default">
        <MapIcon size={22} aria-hidden="true" />
      </span>
      <span class="map-type-tile__label">Default</span>
    </button>
    {#if satelliteAvailable}
      <button
        type="button"
        class="map-type-tile"
        aria-pressed={mapViewStore.satellite}
        onclick={() => setSatellite(true)}
      >
        <span class="map-type-tile__swatch map-type-tile__swatch--satellite">
          <Satellite size={22} aria-hidden="true" />
        </span>
        <span class="map-type-tile__label">Satellite</span>
      </button>
    {/if}
    <button
      type="button"
      class="map-type-tile"
      aria-pressed={tilted}
      onclick={toggle3D}
    >
      <span class="map-type-tile__swatch map-type-tile__swatch--3d">
        <Box size={22} aria-hidden="true" />
      </span>
      <span class="map-type-tile__label">3D</span>
    </button>
  </div>
</section>

<style>
  .map-type-picker {
    display: grid;
    gap: 0.5rem;
  }

  .map-type-picker__heading {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--theme-text, hsl(0, 0%, 25%));
  }

  .map-type-picker__tiles {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 5.5rem));
    gap: 0.75rem;
  }

  .map-type-tile {
    display: grid;
    justify-items: center;
    gap: 0.375rem;
    min-width: 0;
    padding: 0;
    border: none;
    background: none;
    color: var(--theme-text, hsl(0, 0%, 20%));
    font: inherit;
    cursor: pointer;
  }

  .map-type-tile__swatch {
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 1;
    border: 2px solid transparent;
    border-radius: 0.75rem;
    box-shadow: inset 0 0 0 1px hsl(0, 0%, 85%);
  }

  .map-type-tile__swatch--default {
    background: linear-gradient(135deg, #eef4ec 0 55%, #c5c5c0 55% 62%, #8fbf8a 62%);
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }

  .map-type-tile__swatch--satellite {
    background: linear-gradient(135deg, #3f5a36 0 45%, #8a8476 45% 52%, #24401f 52%);
    color: #fff;
  }

  .map-type-tile__swatch--3d {
    background: linear-gradient(160deg, #e8e4dc 0 50%, #d8d4cc 50%);
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }

  .map-type-tile[aria-pressed="true"] .map-type-tile__swatch {
    border-color: var(--theme-blue-text, #1a73e8);
    box-shadow: none;
  }

  .map-type-tile[aria-pressed="true"] .map-type-tile__label {
    color: var(--theme-blue-text, #1a73e8);
    font-weight: 700;
  }

  .map-type-tile:focus-visible {
    outline: none;
  }

  .map-type-tile:focus-visible .map-type-tile__swatch {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: 2px;
  }

  .map-type-tile__label {
    font-size: 0.8125rem;
    font-weight: 600;
  }
</style>
