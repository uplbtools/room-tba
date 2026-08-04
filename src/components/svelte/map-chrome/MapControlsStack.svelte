<script lang="ts">
  import Locate from "@lucide/svelte/icons/locate";
  import LocateFixed from "@lucide/svelte/icons/locate-fixed";
  import {
    enterFlatMapDimension,
    enterTiltedMapDimension,
  } from "@lib/map-dimension-layers";
  import { THREE_D_PITCH, isMap2DPitch } from "@constants/map-dimension";
  import {
    locationStore,
    mapStore,
    terrainStore,
    toastStore,
  } from "@lib/store.svelte";
  import compassIcon from "../../../assets/icons/compass.svg?url";

  type Props = {
    /** Mobile Figma: locate / 2D / zoom only (no compass). */
    hideCompass?: boolean;
  };

  let { hideCompass = false }: Props = $props();

  let bearing = $state(0);
  let pitch = $state(0);
  let centered = $state(false);

  const is2D = $derived(isMap2DPitch(pitch));
  /** compass.svg has N + red tip upright at 0°; counter-rotate with map bearing. */
  const northRotation = $derived(-bearing);

  function syncCamera() {
    const map = mapStore.mapInstance;
    if (!map) return;
    bearing = map.getBearing();
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
    mapStore.mapInstance?.easeTo({ bearing: 0, duration: 400 });
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
    map.easeTo({ pitch: 0, bearing: 0, duration: 400 });
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
    const map = mapStore.mapInstance;
    if (!map) return;
    map.easeTo({ zoom: map.getZoom() + delta, duration: 200 });
  }
</script>

<div
  class="map-controls-stack"
  class:map-controls-stack--mobile={hideCompass}
  aria-label="Map controls"
>
  {#if !hideCompass}
    <button
      type="button"
      class="map-ctrl map-ctrl--compass"
      aria-label="Reset map north"
      title="Reset north"
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
    background: #fff;
    color: #8d1437;
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
    background: #fff;
    box-shadow: var(--shadow-search, 0 1px 3.5px rgb(58 58 71 / 0.2));
  }

  .map-ctrl--compass:hover {
    background: #fff;
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
    color: #111;
  }

  .map-ctrl--round {
    border-radius: 999px;
  }

  .map-controls-stack--mobile {
    --map-ctrl-size: 2.75rem;
    --map-ctrl-zoom-h: 5.5rem;
    gap: 0.5rem;
  }

  .map-ctrl--active {
    background: #feeaea;
    color: #8d1437;
  }

  .map-ctrl-zoom {
    display: flex;
    flex-direction: column;
    width: var(--map-ctrl-size, 2.25rem);
    height: var(--map-ctrl-zoom-h, 4.875rem);
    overflow: hidden;
    border: none;
    border-radius: 0.75rem;
    background: #fff;
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
    color: #111;
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
    background: #fafafa;
  }

  .map-ctrl-zoom__btn:hover {
    background: rgb(0 0 0 / 0.04);
  }
</style>
