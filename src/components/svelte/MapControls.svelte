<script lang="ts">
  import Compass from "@lucide/svelte/icons/compass";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import RotateCw from "@lucide/svelte/icons/rotate-cw";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Box from "@lucide/svelte/icons/box";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import MapIcon from "@lucide/svelte/icons/map";
  import { mapStore, mapViewStore } from "../../lib/store.svelte";
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
  const pinModeTitle = $derived(
    mapViewStore.eventsOnly
      ? "Showing event pins only. Switch to all pins."
      : "Showing all pins. Switch to event pins only.",
  );
  const cameraModeTitle = $derived(
    is2D
      ? "Camera is flat 2D. Switch to tilted 3D."
      : "Camera is tilted 3D. Switch to flat 2D.",
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

<div class="map-controls" aria-label="Map display controls">
  <button
    class="control mode-toggle pin-toggle"
    class:active={mapViewStore.eventsOnly}
    onclick={mapViewStore.toggleEventsOnly}
    title={pinModeTitle}
    aria-label={pinModeTitle}
    aria-pressed={mapViewStore.eventsOnly}
  >
    <CalendarDays size={18} />
    <span class="control-copy">
      <span class="control-kicker">Pins</span>
      <span class="control-value">
        {mapViewStore.eventsOnly ? "Events" : "All"}
      </span>
    </span>
  </button>

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
      <MapIcon size={18} />
    {:else}
      <Box size={18} />
    {/if}
    <span class="control-copy">
      <span class="control-kicker">Camera</span>
      <span class="control-value">{is2D ? "2D" : "3D"}</span>
    </span>
  </button>

  <div class="divider"></div>

  <div class="rotate-row">
    <button
      class="control rotate-step"
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
      class="control rotate-step"
      onclick={rotateRight}
      title="Rotate right"
      aria-label="Rotate map right"
    >
      <RotateCw size={18} />
    </button>
  </div>

  <div class="divider divider--tilt"></div>

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
    gap: 0.25rem;
    padding: 0.3125rem;
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
    gap: 0.1875rem;
    justify-content: center;
  }

  .control {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    width: 2.125rem;
    height: 2.125rem;
    padding: 0;
    border: none;
    border-radius: 0.625rem;
    background-color: transparent;
    box-sizing: border-box;
    color: hsl(0, 0%, 20%);
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
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

  .mode-toggle {
    justify-content: flex-start;
    width: 5.25rem;
    height: 2.15rem;
    padding: 0 0.5rem;
    border: 1px solid hsl(0, 0%, 88%);
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1;
    color: hsl(5, 53%, 32%);
  }

  .control-copy {
    display: grid;
    gap: 0.025rem;
    min-width: 0;
    text-align: left;
  }

  .control-kicker {
    font-size: 0.56rem;
    letter-spacing: 0.05em;
    line-height: 0.95;
    opacity: 0.72;
    text-transform: uppercase;
  }

  .control-value {
    overflow: hidden;
    font-size: 0.75rem;
    line-height: 1;
    text-overflow: ellipsis;
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

  .pin-toggle.active,
  .camera-toggle.active {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 32%);
    color: white;
  }

  .pin-toggle.active:hover,
  .camera-toggle.active:hover {
    background-color: hsl(5, 53%, 38%);
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
       grow the tap targets to the 44px touch-friendly minimum. On touch,
       pinch zooms, a two-finger twist rotates, and a two-finger drag tilts,
       so the rotate/tilt stepper buttons are redundant and removed here to
       reduce clutter. We keep the Pins/Camera toggles (discoverable modes)
       and the compass (reset-to-north can't be done by gesture). */
    .map-controls {
      right: 0.5rem;
      top: 4rem;
    }

    .control {
      width: 2.75rem;
      height: 2.75rem;
    }

    .mode-toggle {
      width: 5.25rem;
      height: 2.75rem;
    }

    .rotate-step,
    .tilt-row,
    .divider--tilt {
      display: none;
    }
  }
</style>
