<script lang="ts">
  import Navigation2 from "@lucide/svelte/icons/navigation-2";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import RotateCw from "@lucide/svelte/icons/rotate-cw";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Box from "@lucide/svelte/icons/box";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import MapIcon from "@lucide/svelte/icons/map";
  import Satellite from "@lucide/svelte/icons/satellite";
  import {
    mapStore,
    mapViewStore,
    plannerStore,
    terrainStore,
  } from "@lib/store.svelte";
  import { onMount } from "svelte";
  import {
    getBasemapProvider,
    onBasemapProviderChange,
  } from "@lib/basemap-provider";
  import { THREE_D_PITCH, isMap2DPitch } from "@constants/map-dimension";
  import {
    enterFlatMapDimension,
    enterTiltedMapDimension,
  } from "@lib/map-dimension-layers";
  import type { MapLibreMap } from "maplibre-gl";

  type Props = {
    /** When true, omit outer card chrome (used inside MapToolsFlyout). */
    embedded?: boolean;
    /** modes = pins + 2D/3D in flyout; camera = desktop rotate/tilt/north on map face. */
    variant?: "modes" | "camera";
  };

  let { embedded = false, variant = "modes" }: Props = $props();

  const showModes = $derived(variant === "modes");
  const showCameraNav = $derived(variant === "camera");

  const ROTATE_STEP = 30;
  const PITCH_STEP = 15;
  const MAX_PITCH = 60;
  /** Lucide navigation arrow tip sits at 45°; offset so north points up at bearing 0. */
  const NORTH_ICON_OFFSET = 45;

  let bearing = $state(0);
  let pitch = $state(0);

  // Hydrate saved plans so the "My classes" toggle knows whether the user has
  // any planned classes (init is idempotent, localStorage only).
  onMount(() => plannerStore.init());

  const northRotation = $derived(-NORTH_ICON_OFFSET - bearing);
  const is2D = $derived(isMap2DPitch(pitch));
  const pinModeTitle = $derived(
    mapViewStore.eventsOnly
      ? "Showing event pins only. Switch to all pins."
      : "Showing all pins. Switch to event pins only.",
  );
  const hasPlannerClasses = $derived(
    (plannerStore.activePlan?.sections.length ?? 0) > 0,
  );
  const classHighlightTitle = $derived(
    !hasPlannerClasses
      ? "Add classes in the Planner to highlight their buildings."
      : mapViewStore.highlightMyBuildings
        ? "Highlighting your class buildings. Switch back to normal pins."
        : "Highlight the buildings your planned classes are in.",
  );
  const cameraModeTitle = $derived(
    is2D
      ? "Camera is flat 2D. Switch to tilted 3D."
      : "Camera is tilted 3D. Switch to flat 2D.",
  );
  // Satellite tiles need a working MapTiler key. Gate on the provider that
  // actually served the basemap: a configured-but-rejected key (#863) falls
  // back to a keyless basemap, and satellite would 403 the same way.
  let basemapProvider = $state(getBasemapProvider());
  onMount(() => onBasemapProviderChange((next) => (basemapProvider = next)));
  const satelliteAvailable = $derived(basemapProvider === "maptiler");
  const satelliteTitle = $derived(
    mapViewStore.satellite
      ? "Showing satellite imagery. Switch to the standard map."
      : "Showing the standard map. Switch to satellite imagery.",
  );
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

  function withMap(fn: (map: MapLibreMap) => void) {
    const map = mapStore.mapInstance;
    if (!map) return;
    fn(map);
  }

  const rotateLeft = () =>
    withMap((map) =>
      map.easeTo({ bearing: map.getBearing() - ROTATE_STEP, duration: 300 }),
    );

  const rotateRight = () =>
    withMap((map) =>
      map.easeTo({ bearing: map.getBearing() + ROTATE_STEP, duration: 300 }),
    );

  const tiltUp = () =>
    withMap((map) =>
      map.easeTo({
        pitch: Math.min(map.getPitch() + PITCH_STEP, MAX_PITCH),
        duration: 300,
      }),
    );

  const tiltDown = () =>
    withMap((map) =>
      map.easeTo({
        pitch: Math.max(map.getPitch() - PITCH_STEP, 0),
        duration: 300,
      }),
    );

  const resetNorth = () =>
    withMap((map) => map.easeTo({ bearing: 0, duration: 400 }));

  const toggleView = () =>
    withMap((map) => {
      if (!isMap2DPitch(map.getPitch())) {
        enterFlatMapDimension(map, terrainStore.enabled);
        map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
        return;
      }
      map.easeTo({ pitch: THREE_D_PITCH, duration: 600 });
      map.once("moveend", () =>
        enterTiltedMapDimension(map, terrainStore.enabled),
      );
    });
</script>

<div
  class="map-view-controls"
  class:embedded
  class:camera-only={showCameraNav}
  aria-label={showCameraNav ? "Map camera controls" : "Map display controls"}
>
  {#if showModes}
    <button
      class="control mode-toggle pin-toggle"
      class:active={mapViewStore.eventsOnly}
      onclick={mapViewStore.toggleEventsOnly}
      title={pinModeTitle}
      aria-label={pinModeTitle}
      aria-pressed={mapViewStore.eventsOnly}
    >
      <CalendarDays size={18} aria-hidden="true" />
      <span class="control-copy">
        <span class="control-kicker">Pins</span>
        <span class="control-value">
          {mapViewStore.eventsOnly ? "Events" : "All"}
        </span>
      </span>
    </button>

    <div class="divider"></div>

    <button
      class="control mode-toggle class-highlight-toggle"
      class:active={mapViewStore.highlightMyBuildings}
      onclick={mapViewStore.toggleHighlightMyBuildings}
      disabled={!hasPlannerClasses}
      title={classHighlightTitle}
      aria-label={classHighlightTitle}
      aria-pressed={mapViewStore.highlightMyBuildings}
    >
      <GraduationCap size={18} aria-hidden="true" />
      <span class="control-copy">
        <span class="control-kicker">My classes</span>
        <span class="control-value">
          {mapViewStore.highlightMyBuildings ? "Highlighted" : "Off"}
        </span>
      </span>
    </button>
    {#if !hasPlannerClasses}
      <p class="control-hint">Add classes in the Planner first.</p>
    {/if}

    <div class="divider"></div>

    <button
      class="control mode-toggle camera-toggle"
      class:active={!is2D}
      onclick={toggleView}
      title={cameraModeTitle}
      aria-label={cameraModeTitle}
      aria-pressed={!is2D}
    >
      {#if is2D}
        <MapIcon size={18} aria-hidden="true" />
      {:else}
        <Box size={18} aria-hidden="true" />
      {/if}
      <span class="control-copy">
        <span class="control-kicker">View</span>
        <span class="control-value">{is2D ? "2D flat" : "3D tilted"}</span>
      </span>
    </button>

    {#if satelliteAvailable}
      <div class="divider"></div>

      <button
        class="control mode-toggle satellite-toggle"
        class:active={mapViewStore.satellite}
        onclick={mapViewStore.toggleSatellite}
        title={satelliteTitle}
        aria-label={satelliteTitle}
        aria-pressed={mapViewStore.satellite}
      >
        {#if mapViewStore.satellite}
          <Satellite size={18} aria-hidden="true" />
        {:else}
          <MapIcon size={18} aria-hidden="true" />
        {/if}
        <span class="control-copy">
          <span class="control-kicker">Basemap</span>
          <span class="control-value">
            {mapViewStore.satellite ? "Satellite" : "Standard"}
          </span>
        </span>
      </button>
    {/if}
  {/if}

  {#if showCameraNav}
    <div class="camera-stack" role="group" aria-label="Camera navigation">
      <button
        type="button"
        class="control icon-btn"
        onclick={rotateLeft}
        title="Rotate left"
        aria-label="Rotate map left"
      >
        <RotateCcw size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        class="control icon-btn north-btn"
        onclick={resetNorth}
        title="Reset to north"
        aria-label="Reset map orientation to north"
      >
        <span class="north-icon" style:rotate={`${northRotation}deg`}>
          <Navigation2 size={16} stroke-width={2} aria-hidden="true" />
        </span>
      </button>
      <button
        type="button"
        class="control icon-btn"
        onclick={rotateRight}
        title="Rotate right"
        aria-label="Rotate map right"
      >
        <RotateCw size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        class="control icon-btn"
        onclick={tiltDown}
        title="Tilt down (less 3D)"
        aria-label="Decrease map tilt"
        disabled={pitch <= 0}
      >
        <ChevronUp size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        class="control icon-btn"
        onclick={tiltUp}
        title="Tilt up (more 3D)"
        aria-label="Increase map tilt"
        disabled={pitch >= MAX_PITCH}
      >
        <ChevronDown size={16} aria-hidden="true" />
      </button>
    </div>
  {/if}
</div>

<style>
  .map-view-controls {
    position: relative;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
    padding: 0.3125rem;
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    backdrop-filter: blur(10px);
    border: 1.5px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: 0.875rem;
    box-shadow: var(
      --map-chrome-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.18),
      0 2px 6px hsla(0, 0%, 0%, 0.18),
      0 8px 20px hsla(0, 0%, 0%, 0.14)
    );
  }

  .map-view-controls.camera-only {
    flex-shrink: 0;
    padding: 0.1875rem;
    border-radius: var(--map-chrome-toggle-radius, 0.625rem);
  }

  .camera-stack {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.125rem;
  }

  .map-view-controls.embedded {
    box-shadow: none;
    border: none;
    padding: 0;
    background: transparent;
    backdrop-filter: none;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    gap: 0.0625rem;
  }

  /* Camera stack is icon-only; modes panel needs full accordion width. */
  .map-view-controls.embedded.camera-only {
    width: var(--map-chrome-toggle-size, 2rem);
  }

  .map-view-controls.embedded:not(.camera-only) {
    width: 100%;
  }

  .divider {
    height: 1px;
    background-color: hsl(0, 0%, 90%);
    margin: 0 0.125rem;
  }

  .control {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    padding: 0;
    border: none;
    border-radius: var(--map-chrome-toggle-radius, 0.5rem);
    background-color: transparent;
    box-sizing: border-box;
    color: hsl(0, 0%, 28%);
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }

  .icon-btn {
    width: var(--map-chrome-toggle-size, 2rem);
    height: var(--map-chrome-toggle-size, 2rem);
  }

  .control:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .control:hover {
    background-color: hsla(0, 0%, 0%, 0.08);
  }

  .control:active {
    background-color: hsla(0, 0%, 0%, 0.14);
  }

  .control:disabled {
    color: hsl(0, 0%, 52%);
    cursor: default;
    background-color: transparent;
  }

  /* The kicker's 0.72 opacity stacked on the disabled grey left the label at
     1.76:1, so the row read as blank rather than disabled. */
  .control:disabled .control-kicker {
    opacity: 1;
  }

  .north-btn {
    color: hsl(5, 40%, 42%);
  }

  .north-icon {
    display: inline-flex;
    transition: rotate 0.2s ease;
  }

  @media (prefers-reduced-motion: reduce) {
    .north-icon {
      transition: none;
    }
  }

  .mode-toggle {
    display: grid;
    grid-template-columns: 1.125rem minmax(0, 1fr);
    column-gap: 0.4375rem;
    align-items: center;
    justify-items: start;
    width: 100%;
    max-width: 100%;
    min-height: 2.125rem;
    height: auto;
    padding: 0.25rem 0.5rem;
    border: 1px solid hsl(0, 0%, 88%);
    border-radius: 0.625rem;
    box-sizing: border-box;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.15;
    color: hsl(5, 53%, 32%);
    overflow: visible;
  }

  .mode-toggle :global(svg) {
    grid-column: 1;
    justify-self: center;
    flex-shrink: 0;
    width: 1.125rem;
    height: 1.125rem;
  }

  .mode-toggle .control-copy {
    grid-column: 2;
    width: 100%;
  }

  .control-copy {
    display: grid;
    gap: 0.0625rem;
    min-width: 0;
    text-align: left;
    overflow: visible;
  }

  .control-kicker {
    font-size: 0.625rem;
    letter-spacing: 0.04em;
    line-height: 1.15;
    opacity: 0.72;
    text-transform: uppercase;
  }

  .control-value {
    overflow: visible;
    font-size: 0.75rem;
    line-height: 1.15;
    text-overflow: clip;
    white-space: nowrap;
  }

  .pin-toggle {
    border-color: hsl(5, 34%, 78%);
    background-color: hsl(0, 100%, 99%);
  }

  .pin-toggle:hover {
    border-color: hsl(5, 34%, 68%);
    background-color: hsl(0, 78%, 97%);
  }

  .class-highlight-toggle {
    border-color: hsl(5, 34%, 78%);
    background-color: hsl(0, 100%, 99%);
  }

  .class-highlight-toggle:hover:not(:disabled) {
    border-color: hsl(5, 34%, 68%);
    background-color: hsl(0, 78%, 97%);
  }

  .class-highlight-toggle:disabled {
    border-color: hsl(0, 0%, 88%);
    background-color: hsl(0, 0%, 98%);
  }

  .control-hint {
    margin: 0;
    padding: 0 0.25rem;
    color: hsl(0, 0%, 45%);
    font-size: 0.625rem;
    line-height: 1.3;
  }

  .camera-toggle,
  .satellite-toggle {
    border-color: hsl(5, 34%, 78%);
    background-color: hsl(0, 100%, 99%);
  }

  .camera-toggle:hover,
  .satellite-toggle:hover {
    border-color: hsl(5, 34%, 68%);
    background-color: hsl(0, 78%, 97%);
  }

  .mode-toggle.active {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 32%);
    color: white;
  }

  .mode-toggle.active .control-kicker,
  .mode-toggle.active .control-value {
    color: white;
  }

  .mode-toggle.active .control-kicker {
    opacity: 0.88;
  }

  .mode-toggle.active:hover:not(:disabled) {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 38%);
  }

  @media (max-width: 48rem) {
    .icon-btn {
      width: 2rem;
      height: 2rem;
    }

    .mode-toggle {
      width: 100%;
      min-height: 2.25rem;
      padding: 0.3125rem 0.5625rem;
    }
  }
</style>
