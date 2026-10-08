<script lang="ts">
  import Navigation2 from "@lucide/svelte/icons/navigation-2";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import RotateCw from "@lucide/svelte/icons/rotate-cw";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
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
  import { debugMode } from "@lib/debug-flag";

  type Props = {
    /** When true, omit outer card chrome (used inside MapToolsFlyout). */
    embedded?: boolean;
    /**
     * camera = desktop rotate/tilt/north on map face; settings = pins, class
     * highlight, map style and basemap as labelled rows (switches for on/off,
     * segments for choices) for the Settings modal. The Layers sheet builds
     * its own rows from the same stores.
     */
    variant?: "camera" | "settings";
  };

  let { embedded = false, variant = "settings" }: Props = $props();

  const showCameraNav = $derived(variant === "camera");
  const showSettings = $derived(variant === "settings");

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
  const hasPlannerClasses = $derived(
    (plannerStore.activePlan?.sections.length ?? 0) > 0,
  );
  // Satellite tiles need a working MapTiler key. Gate on the provider that
  // actually served the basemap: a configured-but-rejected key (#863) falls
  // back to a keyless basemap, and satellite would 403 the same way.
  let basemapProvider = $state(getBasemapProvider());
  onMount(() => onBasemapProviderChange((next) => (basemapProvider = next)));
  const satelliteAvailable = $derived(basemapProvider === "maptiler");
  const cameraDebugTitle = $derived(
    mapViewStore.cameraDebug
      ? "Hide the live camera readout."
      : "Show a live camera readout (zoom, pitch, bearing, center).",
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

  function setTilted(tilted: boolean) {
    if (tilted === !is2D) return;
    toggleView();
  }

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
  class:settings={showSettings}
  aria-label={showCameraNav ? "Map camera controls" : "Map display controls"}
>
  {#if showSettings}
    <div class="map-chrome-row">
      <span class="map-chrome-row__label" id="map-settings-pins">Pins</span>
      <div
        class="map-chrome-row__control"
        role="group"
        aria-labelledby="map-settings-pins"
      >
        <button
          type="button"
          class="map-chrome-chip"
          class:map-chrome-chip--toggle-active={!mapViewStore.eventsOnly}
          aria-pressed={!mapViewStore.eventsOnly}
          onclick={() => mapViewStore.eventsOnly && mapViewStore.toggleEventsOnly()}
        >
          All
        </button>
        <button
          type="button"
          class="map-chrome-chip"
          class:map-chrome-chip--toggle-active={mapViewStore.eventsOnly}
          aria-pressed={mapViewStore.eventsOnly}
          onclick={() => !mapViewStore.eventsOnly && mapViewStore.toggleEventsOnly()}
        >
          Events only
        </button>
      </div>
    </div>

    <div class="map-chrome-row">
      <span class="map-chrome-row__label" id="map-settings-my-classes">
        Highlight my class buildings
      </span>
      <button
        type="button"
        role="switch"
        class="map-chrome-switch"
        aria-checked={mapViewStore.highlightMyBuildings}
        aria-labelledby="map-settings-my-classes"
        aria-describedby={hasPlannerClasses
          ? undefined
          : "map-settings-my-classes-hint"}
        disabled={!hasPlannerClasses}
        onclick={mapViewStore.toggleHighlightMyBuildings}
      ></button>
    </div>
    {#if !hasPlannerClasses}
      <p id="map-settings-my-classes-hint" class="map-chrome-row-hint">
        Add classes in the Planner first.
      </p>
    {/if}

    <div class="map-chrome-row">
      <span class="map-chrome-row__label" id="map-settings-style">
        Map style
      </span>
      <div
        class="map-chrome-row__control"
        role="group"
        aria-labelledby="map-settings-style"
      >
        <button
          type="button"
          class="map-chrome-chip"
          class:map-chrome-chip--toggle-active={is2D}
          aria-pressed={is2D}
          onclick={() => setTilted(false)}
        >
          2D flat
        </button>
        <button
          type="button"
          class="map-chrome-chip"
          class:map-chrome-chip--toggle-active={!is2D}
          aria-pressed={!is2D}
          onclick={() => setTilted(true)}
        >
          3D tilted
        </button>
      </div>
    </div>

    {#if satelliteAvailable}
      <div class="map-chrome-row">
        <span class="map-chrome-row__label" id="map-settings-basemap">
          Basemap
        </span>
        <div
          class="map-chrome-row__control"
          role="group"
          aria-labelledby="map-settings-basemap"
        >
          <button
            type="button"
            class="map-chrome-chip"
            class:map-chrome-chip--toggle-active={!mapViewStore.satellite}
            aria-pressed={!mapViewStore.satellite}
            onclick={() => mapViewStore.satellite && mapViewStore.toggleSatellite()}
          >
            Standard
          </button>
          <button
            type="button"
            class="map-chrome-chip"
            class:map-chrome-chip--toggle-active={mapViewStore.satellite}
            aria-pressed={mapViewStore.satellite}
            onclick={() => !mapViewStore.satellite && mapViewStore.toggleSatellite()}
          >
            Satellite
          </button>
        </div>
      </div>
    {/if}

    <!-- Developer tool: only with ?debug=1 / room-tba:debug. -->
    {#if debugMode}
    <div class="map-chrome-row">
      <span class="map-chrome-row__label" id="map-settings-camera-details">
        Camera details
      </span>
      <button
        type="button"
        role="switch"
        class="map-chrome-switch"
        aria-checked={mapViewStore.cameraDebug}
        aria-labelledby="map-settings-camera-details"
        title={cameraDebugTitle}
        onclick={mapViewStore.toggleCameraDebug}
      ></button>
    </div>
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
    background-color: var(--map-chrome-surface, var(--theme-surface-translucent, rgba(255, 255, 255, 0.98)));
    backdrop-filter: blur(10px);
    border: 1.5px solid var(--map-chrome-border, var(--theme-border-strong, hsl(0, 0%, 58%)));
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

  .map-view-controls.embedded.settings {
    gap: 0.375rem;
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
    color: var(--theme-text, hsl(0, 0%, 28%));
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
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: 1px;
  }

  .control:hover {
    background-color: hsla(0, 0%, 0%, 0.08);
  }

  .control:active {
    background-color: hsla(0, 0%, 0%, 0.14);
  }

  .control:disabled {
    color: var(--theme-text-muted, hsl(0, 0%, 52%));
    cursor: default;
    background-color: transparent;
  }

  .north-btn {
    color: var(--theme-accent-text, hsl(5, 40%, 42%));
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

  @media (max-width: 48rem) {
    .icon-btn {
      width: 2rem;
      height: 2rem;
    }
  }
</style>
