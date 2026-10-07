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
  import { untrack } from "svelte";
  import Locate from "@lucide/svelte/icons/locate";
  import LocateFixed from "@lucide/svelte/icons/locate-fixed";
  import Navigation2 from "@lucide/svelte/icons/navigation-2";
  import Focus from "@lucide/svelte/icons/focus";
  import { MediaQuery } from "svelte/reactivity";
  import type { MapLibreEvent } from "maplibre-gl";
  import { CAMPUS_DEFAULT_CAMERA } from "@constants/map-terrain";
  import { locationStore, mapStore, toastStore } from "@lib/store.svelte";
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

  /** Touch screens zoom with a pinch; +/- buttons are a mouse affordance. */
  const coarsePointer = new MediaQuery("(pointer: coarse)");
  const showZoom = $derived(Boolean(controller) || !coarsePointer.current);

  const followMode = $derived(locationStore.followMode);
  const locateLabel = $derived(
    followMode === "heading"
      ? "Following your heading. Show north up"
      : followMode === "follow"
        ? locationStore.heading !== null
          ? "Following your location. Follow your heading"
          : "Following your location"
        : "My location",
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

  function syncCamera() {
    const map = mapStore.mapInstance;
    if (!map) return;
    bearing = map.getBearing();
    cameraKnown = true;
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

  /**
   * Locate button, Google Maps style: the first tap finds you and follows
   * the dot; the next turns the map with your compass heading; the next goes
   * back to north-up following. Dragging the map stops following.
   */
  function cycleLocate() {
    if (!locationStore.coords) {
      // Fly to the first fix as soon as it lands (see the effect below).
      flyOnFix = true;
      locationStore.followMode = "follow";
      locationStore.requestLocation();
      return;
    }
    const map = mapStore.mapInstance;
    if (!map) {
      toastStore.show("Map component is still initializing", "info");
      return;
    }
    if (followMode === "off") {
      locationStore.followMode = "follow";
      map.flyTo({
        center: locationStore.coords,
        zoom: Math.max(map.getZoom(), 17),
        duration: 1200,
      });
      return;
    }
    if (followMode === "follow" && locationStore.heading !== null) {
      locationStore.followMode = "heading";
      map.easeTo({
        center: locationStore.coords,
        bearing: locationStore.heading,
        duration: 600,
      });
      return;
    }
    // Following without a compass, or leaving heading mode: re-centre with
    // the map back at its home orientation.
    locationStore.followMode = "follow";
    map.easeTo({
      center: locationStore.coords,
      bearing: followMode === "heading" ? homeBearing : map.getBearing(),
      duration: 600,
    });
  }

  /** Set by a locate tap made before there was a fix. */
  let flyOnFix = false;

  // Keep the dot (and, in heading mode, the compass) under the camera. The
  // mode itself is untracked: cycleLocate animates each mode change, and an
  // extra ease here would cut that animation short. Heading is only a
  // dependency in heading mode, so compass jitter never moves a north-up map.
  $effect(() => {
    const map = mapStore.mapInstance;
    const coords = locationStore.coords;
    if (!map || !coords) return;
    const mode = untrack(() => locationStore.followMode);
    if (mode === "off") return;
    if (flyOnFix) {
      flyOnFix = false;
      map.flyTo({
        center: coords,
        zoom: Math.max(map.getZoom(), 17),
        duration: 1200,
      });
      return;
    }
    const heading = mode === "heading" ? locationStore.heading : null;
    map.easeTo({
      center: coords,
      ...(heading !== null ? { bearing: heading } : {}),
      duration: 300,
    });
  });

  // A hand on the map ends following, like every map app. Camera moves the
  // app makes itself carry no originalEvent.
  $effect(() => {
    const map = mapStore.mapInstance;
    if (!map) return;
    const stopFollowing = (event: MapLibreEvent<unknown>) => {
      if (!(event as { originalEvent?: unknown }).originalEvent) return;
      if (locationStore.followMode !== "off") locationStore.followMode = "off";
    };
    map.on("dragstart", stopFollowing);
    map.on("rotatestart", stopFollowing);
    return () => {
      map.off("dragstart", stopFollowing);
      map.off("rotatestart", stopFollowing);
    };
  });

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
    class="map-ctrl map-ctrl--locate"
    class:map-ctrl--round={hideCompass}
    class:map-ctrl--following={followMode !== "off"}
    data-follow={followMode}
    aria-label={locateLabel}
    title={locateLabel}
    aria-pressed={followMode !== "off"}
    onclick={cycleLocate}
  >
    {#if followMode === "heading"}
      <Navigation2 size={18} aria-hidden="true" fill="currentColor" />
    {:else if followMode === "follow" && locationStore.coords}
      <LocateFixed size={18} aria-hidden="true" />
    {:else}
      <Locate size={18} aria-hidden="true" />
    {/if}
  </button>
  {/if}

  {#if showZoom}
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
  {/if}
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

  /* Following: the button turns the blue of the location dot, the way
     Google Maps marks an active locate. */
  .map-ctrl--following {
    color: #1a73e8;
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
