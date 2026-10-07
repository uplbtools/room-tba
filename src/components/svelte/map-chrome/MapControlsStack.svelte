<script lang="ts" module>
  export type MapControlsController = {
    /** Degrees clockwise from north, like `map.getBearing()`. */
    readonly bearing: number;
    resetNorth: () => void;
    zoomBy: (delta: number) => void;
    recenter: () => void;
    exitTo2D: () => void;
  };
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import Locate from "@lucide/svelte/icons/locate";
  import LocateFixed from "@lucide/svelte/icons/locate-fixed";
  import Satellite from "@lucide/svelte/icons/satellite";
  import Focus from "@lucide/svelte/icons/focus";
  import {
    enterFlatMapDimension,
    enterTiltedMapDimension,
  } from "@lib/map-dimension-layers";
  import { THREE_D_PITCH, isMap2DPitch } from "@constants/map-dimension";
  import { CAMPUS_DEFAULT_CAMERA } from "@constants/map-terrain";
  import {
    locationStore,
    mapStore,
    mapViewStore,
    terrainStore,
    toastStore,
  } from "@lib/store.svelte";
  import {
    getBasemapProvider,
    onBasemapProviderChange,
  } from "@lib/basemap-provider";
  import compassIcon from "../../../assets/icons/compass.svg?url";

  type Props = {
    /**
     * Mobile: no permanent compass (Figma: locate / 2D / zoom). It appears
     * only while the map is turned away from the campus default bearing, so a
     * two-finger twist can always be undone with one tap.
     */
    hideCompass?: boolean;
    /**
     * Drive the stack from a camera other than the main MapLibre map (the 3D
     * building viewer's three.js scene). Location and satellite hide, the
     * locate slot becomes "recenter", and the 2D button exits that view.
     */
    controller?: MapControlsController;
  };

  let { hideCompass = false, controller }: Props = $props();

  let bearing = $state(0);
  /** Until the map reports its camera, the bearing above is a placeholder. */
  let cameraKnown = $state(false);
  let pitch = $state(0);
  let centered = $state(false);

  const is2D = $derived(isMap2DPitch(pitch));
  let basemapProvider = $state(getBasemapProvider());
  const satelliteAvailable = $derived(basemapProvider === "maptiler");
  const satelliteTitle = $derived(
    mapViewStore.satellite
      ? "Switch to the standard map"
      : "Switch to satellite imagery",
  );
  /** compass.svg has N + red tip upright at 0°; counter-rotate with map bearing. */
  const northRotation = $derived(-(controller?.bearing ?? bearing));
  /**
   * Mobile resets to the campus default view, which is itself rotated, so
   * "rotated" means away from that bearing (folded into -180..180; a degree
   * of drift still counts as home).
   */
  const homeBearing = $derived(hideCompass ? CAMPUS_DEFAULT_CAMERA.bearing : 0);
  const rotated = $derived(
    Math.abs(((((bearing - homeBearing + 180) % 360) + 360) % 360) - 180) > 1,
  );
  // On phones the compass only appears once the real camera is known: before
  // the map loaded, the placeholder bearing read as "rotated" and the compass
  // flashed up over a blank map.
  const showCompass = $derived(
    Boolean(controller) || !hideCompass || (cameraKnown && rotated),
  );
  /** Round 44px phone styling; the 3D viewer is a touch surface everywhere. */
  const roundStyle = $derived(hideCompass || Boolean(controller));

  onMount(() => onBasemapProviderChange((next) => (basemapProvider = next)));

  function syncCamera() {
    const map = mapStore.mapInstance;
    if (!map) return;
    bearing = map.getBearing();
    cameraKnown = true;
    pitch = map.getPitch();
  }

  $effect(() => {
    const map = mapStore.mapInstance;
    if (!map) return;
    syncCamera();
    const onChange = () => syncCamera();
    map.on("rotate", onChange);
    map.on("pitch", onChange);
    map.on("move", onChange);
    return () => {
      map.off("rotate", onChange);
      map.off("pitch", onChange);
      map.off("move", onChange);
    };
  });

  function resetNorth() {
    if (controller) return controller.resetNorth();
    mapStore.mapInstance?.easeTo({ bearing: homeBearing, duration: 400 });
  }

  function toggleDimension() {
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
    // Pitch only: dropping to 2D used to also snap the bearing to north, which
    // threw away a rotation the user set on purpose. The compass button is the
    // control that resets north.
    map.easeTo({ pitch: 0, duration: 400 });
  }

  function goToLocation() {
    if (!locationStore.coords) {
      locationStore.requestLocation();
      return;
    }
    if (!mapStore.mapInstance) {
      toastStore.show("Map component is still initializing", "info");
      return;
    }
    centered = true;
    mapStore.mapInstance.flyTo({
      center: locationStore.coords,
      zoom: 17,
      offset: [0, -24],
      bearing: locationStore.bearing ?? 0,
      duration: 1500,
    });
  }

  function zoomBy(delta: number) {
    if (controller) return controller.zoomBy(delta);
    const map = mapStore.mapInstance;
    if (!map) return;
    map.easeTo({ zoom: map.getZoom() + delta, duration: 200 });
  }
</script>

<div
  class="map-controls-stack"
  class:map-controls-stack--mobile={roundStyle}
  aria-label="Map controls"
>
  {#if showCompass}
    <button
      type="button"
      class="map-ctrl map-ctrl--compass"
      class:map-ctrl--compass-mobile={hideCompass && !controller}
      aria-label={hideCompass ? "Reset map rotation" : "Reset map north"}
      title={hideCompass ? "Reset rotation" : "Reset north"}
      onclick={resetNorth}
    >
      <img
        src={compassIcon}
        alt=""
        width="64"
        height="64"
        class="map-ctrl__compass-img"
        style={`transform: rotate(${northRotation}deg)`}
        decoding="async"
        aria-hidden="true"
      />
    </button>
  {/if}

  {#if controller}
    <button
      type="button"
      class="map-ctrl map-ctrl--round"
      aria-label="Recenter building"
      title="Recenter"
      onclick={controller.recenter}
    >
      <Focus size={18} aria-hidden="true" />
    </button>
    <button
      type="button"
      class="map-ctrl map-ctrl--label map-ctrl--round"
      aria-label="Exit 3D view to the 2D map"
      title="2D map"
      onclick={controller.exitTo2D}
    >
      2D
    </button>
  {:else}
  <button
    type="button"
    class="map-ctrl"
    class:map-ctrl--round={hideCompass}
    class:map-ctrl--active={centered}
    aria-label="My location"
    title="My location"
    aria-pressed={centered}
    onclick={goToLocation}
  >
    {#if centered}
      <LocateFixed size={18} aria-hidden="true" />
    {:else}
      <Locate size={18} aria-hidden="true" />
    {/if}
  </button>

  <button
    type="button"
    class="map-ctrl map-ctrl--label"
    class:map-ctrl--round={hideCompass}
    class:map-ctrl--active={!is2D}
    aria-label={is2D ? "Switch to 3D map" : "Switch to 2D map"}
    title={is2D ? "3D" : "2D"}
    aria-pressed={!is2D}
    onclick={toggleDimension}
  >
    {is2D ? "2D" : "3D"}
  </button>

  {#if satelliteAvailable}
    <button
      type="button"
      class="map-ctrl"
      class:map-ctrl--active={mapViewStore.satellite}
      aria-label={satelliteTitle}
      title={satelliteTitle}
      aria-pressed={mapViewStore.satellite}
      onclick={mapViewStore.toggleSatellite}
    >
      <Satellite size={18} aria-hidden="true" />
    </button>
  {/if}
  {/if}

  <div class="map-ctrl-zoom" role="group" aria-label="Zoom">
    <button
      type="button"
      class="map-ctrl-zoom__btn"
      aria-label="Zoom in"
      onclick={() => zoomBy(1)}
    >
      +
    </button>
    <button
      type="button"
      class="map-ctrl-zoom__btn"
      aria-label="Zoom out"
      onclick={() => zoomBy(-1)}
    >
      −
    </button>
  </div>
</div>

<style>
  .map-controls-stack {
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
  }

  .map-ctrl {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--map-ctrl-size, 2.25rem);
    height: var(--map-ctrl-size, 2.25rem);
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 0.625rem;
    background: var(--theme-surface, #fff);
    color: var(--theme-accent-text, #8d1437);
    box-shadow: var(--shadow-search, 0 1px 3.5px rgb(58 58 71 / 0.2));
    cursor: pointer;
  }

  .map-ctrl--compass {
    width: var(--map-ctrl-compass, 2.5rem);
    height: var(--map-ctrl-compass, 2.5rem);
    padding: 0;
    overflow: hidden;
    border: none;
    border-radius: 999px;
    background: var(--theme-surface, #fff);
    box-shadow: var(--shadow-search, 0 1px 3.5px rgb(58 58 71 / 0.2));
  }

  .map-ctrl--compass-mobile {
    animation: map-ctrl-compass-in var(--motion-duration-micro, 200ms) ease-out;
  }

  @keyframes map-ctrl-compass-in {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .map-ctrl--compass-mobile {
      animation: none;
    }
  }

  .map-ctrl--compass:hover {
    background: var(--theme-surface, #fff);
  }

  .map-ctrl__compass-img {
    display: block;
    width: 100%;
    height: 100%;
    max-width: none;
    transform-origin: center;
    transition: transform 80ms linear;
  }

  @media (prefers-reduced-motion: reduce) {
    .map-ctrl__compass-img {
      transition: none;
    }
  }

  .map-ctrl--label {
    font-family: Inter, system-ui, sans-serif;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--theme-text, #111);
  }

  .map-ctrl--round {
    border-radius: 999px;
  }

  .map-controls-stack--mobile {
    --map-ctrl-compass: 2.75rem;
    --map-ctrl-size: 2.75rem;
    --map-ctrl-zoom-h: 5.5rem;
    gap: 0.5rem;
  }

  /* Phones: one shape language for the whole column. Every button is a 44px
     circle and the zoom pair a pill, matching the round filter chips. */
  .map-controls-stack--mobile .map-ctrl {
    border-radius: 999px;
  }

  .map-controls-stack--mobile .map-ctrl-zoom {
    border-radius: 999px;
  }

  .map-ctrl--active {
    background: var(--theme-accent-soft, #feeaea);
    color: var(--theme-accent-text, #8d1437);
  }

  .map-ctrl-zoom {
    display: flex;
    flex-direction: column;
    width: var(--map-ctrl-size, 2.25rem);
    height: var(--map-ctrl-zoom-h, 4.875rem);
    overflow: hidden;
    border: none;
    border-radius: 0.75rem;
    background: var(--theme-surface, #fff);
    box-shadow: var(--shadow-search, 0 1px 3.5px rgb(58 58 71 / 0.2));
  }

  .map-ctrl-zoom__btn {
    box-sizing: border-box;
    display: inline-flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    color: var(--theme-text, #111);
    font-family: inherit;
    font-size: 1.05rem;
    font-weight: 500;
    line-height: 1;
    text-align: center;
    cursor: pointer;
  }

  .map-ctrl-zoom__btn + .map-ctrl-zoom__btn {
    border-top: 1px solid rgb(51 37 41 / 0.12);
  }

  .map-ctrl:hover {
    background: var(--theme-surface, #fafafa);
  }

  .map-ctrl-zoom__btn:hover {
    background: rgb(0 0 0 / 0.04);
  }
</style>
