<script lang="ts">
  import {
    Compass,
    RotateCcw,
    RotateCw,
    ChevronUp,
    ChevronDown,
    Box,
    Map as MapIcon,
  } from "@lucide/svelte";
  import { mapStore } from "../../lib/store.svelte";
  import type { MapLibreMap } from "maplibre-gl";

  const ROTATE_STEP = 30;
  const PITCH_STEP = 15;
  const MAX_PITCH = 60;
  const THREE_D_PITCH = 60;
  // Pitch at or below this (in degrees) is treated as a flat 2D top-down view.
  const TWO_D_THRESHOLD = 1;

  let bearing = $state(0);
  let pitch = $state(0);

  const is2D = $derived(pitch <= TWO_D_THRESHOLD);

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
    // Manual camera moves should win over the idle auto-rotation animation.
    mapStore.stopAutoRotate?.();
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
      if (map.getPitch() > TWO_D_THRESHOLD) {
        // Switch to a flat, north-up top-down view.
        map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
      } else {
        map.easeTo({ pitch: THREE_D_PITCH, duration: 600 });
      }
    });
</script>

<div class="map-controls" aria-label="Map orientation controls">
  <button
    class="control view-toggle"
    onclick={toggleView}
    title={is2D ? "Switch to 3D tilted view" : "Switch to 2D top-down view"}
    aria-label={is2D ? "Switch to 3D tilted view" : "Switch to 2D top-down view"}
    aria-pressed={is2D}
  >
    {#if is2D}
      <Box size={18} />
      <span>3D</span>
    {:else}
      <MapIcon size={18} />
      <span>2D</span>
    {/if}
  </button>

  <div class="divider"></div>

  <div class="rotate-row">
    <button
      class="control"
      onclick={rotateLeft}
      title="Rotate left"
      aria-label="Rotate map left"
    >
      <RotateCcw size={18} />
    </button>
    <button
      class="control compass"
      onclick={resetNorth}
      title="Reset to north"
      aria-label="Reset map orientation to north"
    >
      <span class="compass-icon" style:rotate={`${-bearing}deg`}>
        <Compass size={20} />
      </span>
    </button>
    <button
      class="control"
      onclick={rotateRight}
      title="Rotate right"
      aria-label="Rotate map right"
    >
      <RotateCw size={18} />
    </button>
  </div>

  <div class="divider"></div>

  <div class="tilt-row">
    <button
      class="control"
      onclick={tiltDown}
      title="Tilt down (less 3D)"
      aria-label="Decrease map tilt"
      disabled={pitch <= 0}
    >
      <ChevronDown size={18} />
    </button>
    <button
      class="control"
      onclick={tiltUp}
      title="Tilt up (more 3D)"
      aria-label="Increase map tilt"
      disabled={pitch >= MAX_PITCH}
    >
      <ChevronUp size={18} />
    </button>
  </div>
</div>

<style>
  .map-controls {
    position: absolute;
    right: 0.5rem;
    top: 0.5rem;
    z-index: 15;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.375rem;
    padding: 0.375rem;
    background-color: white;
    border-radius: 0.875rem;
    box-shadow: 0 2px 0.5rem 0 hsla(0, 0%, 0%, 0.2);
  }

  .divider {
    height: 1px;
    background-color: hsl(0, 0%, 90%);
    margin: 0 0.125rem;
  }

  .rotate-row,
  .tilt-row {
    display: flex;
    gap: 0.25rem;
    justify-content: center;
  }

  .control {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    border: none;
    border-radius: 0.625rem;
    background-color: transparent;
    color: hsl(0, 0%, 20%);
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .control:hover {
    background-color: hsla(0, 0%, 0%, 0.08);
  }

  .control:active {
    background-color: hsla(0, 0%, 0%, 0.14);
  }

  .control:disabled {
    color: hsl(0, 0%, 75%);
    cursor: default;
    background-color: transparent;
  }

  .view-toggle {
    width: 100%;
    height: 2.25rem;
    font-size: 0.8125rem;
    font-weight: 700;
    color: hsl(5, 53%, 32%);
  }

  .compass {
    color: hsl(5, 53%, 32%);
  }

  .compass-icon {
    display: inline-flex;
    transition: rotate 0.2s ease;
  }

  @media (max-width: 800px) {
    /* Drop below the full-width search box so the two never overlap, and
       grow the tap targets to the 44px touch-friendly minimum. Native
       touch gestures (two-finger twist/drag) exist but aren't discoverable,
       so these explicit affordances stay visible on mobile too. */
    .map-controls {
      right: 0.5rem;
      top: 4rem;
    }

    .control {
      width: 2.75rem;
      height: 2.75rem;
    }
  }
</style>
