<script lang="ts">
  import { mapStore, terrainStore } from "@lib/store.svelte";
  import { THREE_D_PITCH, isMap2DPitch } from "@constants/map-dimension";
  import {
    enterFlatMapDimension,
    enterTiltedMapDimension,
  } from "@lib/map-dimension-layers";
  import type { MapLibreMap } from "maplibre-gl";

  type Props = {
    /** Inline chip-row size (~1.75rem); used on mobile search chrome. */
    compact?: boolean;
    /** Inside desktop camera card — no outer chrome, vertical stack. */
    embedded?: boolean;
  };

  let { compact = false, embedded = false }: Props = $props();

  let pitch = $state(0);

  const is2D = $derived(isMap2DPitch(pitch));

  function syncPitch() {
    const map = mapStore.mapInstance;
    if (!map) return;
    pitch = map.getPitch();
  }

  $effect(() => {
    const map = mapStore.mapInstance;
    if (!map) return;
    syncPitch();
    const onChange = () => syncPitch();
    map.on("pitch", onChange);
    map.on("move", onChange);
    return () => {
      map.off("pitch", onChange);
      map.off("move", onChange);
    };
  });

  function withMap(fn: (map: MapLibreMap) => void) {
    const map = mapStore.mapInstance;
    if (!map) return;
    fn(map);
  }

  const go2D = () =>
    withMap((map) => {
      if (isMap2DPitch(map.getPitch())) return;
      enterFlatMapDimension(map, terrainStore.enabled);
      map.easeTo({ pitch: 0, bearing: 0, duration: 400 });
    });

  const go3D = () =>
    withMap((map) => {
      if (!isMap2DPitch(map.getPitch())) return;
      map.easeTo({ pitch: THREE_D_PITCH, duration: 400 });
      map.once("moveend", () =>
        enterTiltedMapDimension(map, terrainStore.enabled),
      );
    });
</script>

<div
  class="map-dimension-toggle"
  class:compact
  class:embedded
  role="group"
  aria-label="Map view mode"
>
  <button
    type="button"
    class="segment"
    class:active={is2D}
    onclick={go2D}
    aria-pressed={is2D}
    aria-label="Switch to flat 2D map"
    title="Flat top-down map"
  >
    2D
  </button>
  <button
    type="button"
    class="segment"
    class:active={!is2D}
    onclick={go3D}
    aria-pressed={!is2D}
    aria-label="Switch to tilted 3D map"
    title="Tilted perspective map"
  >
    3D
  </button>
</div>

<style>
  .map-dimension-toggle {
    pointer-events: auto;
    display: inline-flex;
    flex-shrink: 0;
    padding: 0.1875rem;
    border: 1.5px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: 0.75rem;
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    backdrop-filter: blur(10px);
    box-shadow: var(
      --map-chrome-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.18),
      0 2px 6px hsla(0, 0%, 0%, 0.18),
      0 8px 20px hsla(0, 0%, 0%, 0.14)
    );
  }

  .segment {
    min-width: 2.25rem;
    min-height: 1.75rem;
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 0.5rem;
    background: transparent;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    line-height: 1;
    color: hsl(0, 0%, 32%);
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }

  .segment:hover:not(.active) {
    background-color: hsla(0, 0%, 0%, 0.06);
  }

  .segment:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .segment.active {
    background-color: hsl(5, 53%, 96%);
    color: hsl(5, 53%, 28%);
    font-weight: 700;
  }

  .map-dimension-toggle.embedded {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.125rem;
    width: var(--map-chrome-toggle-size, 2rem);
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    backdrop-filter: none;
    box-shadow: none;
  }

  .map-dimension-toggle.embedded .segment {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-width: 0;
    height: var(--map-chrome-toggle-size, 2rem);
    min-height: var(--map-chrome-toggle-size, 2rem);
    padding: 0;
    border-radius: var(--map-chrome-toggle-radius, 0.5rem);
    font-size: 0.625rem;
    letter-spacing: 0.04em;
  }

  .map-dimension-toggle.embedded .segment:hover:not(.active) {
    background-color: hsla(0, 0%, 0%, 0.08);
  }

  .map-dimension-toggle.embedded .segment.active {
    background-color: hsla(5, 53%, 32%, 0.1);
    color: hsl(5, 53%, 28%);
  }

  .map-dimension-toggle.compact {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: stretch;
    box-sizing: border-box;
    width: 4.125rem;
    height: 1.75rem;
    padding: 0.125rem;
    border-width: 1px;
    border-radius: 999px;
    overflow: hidden;
    box-shadow: none;
    backdrop-filter: none;
  }

  .map-dimension-toggle.compact .segment {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    height: 100%;
    min-height: 0;
    padding: 0;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-weight: 600;
  }

  .map-dimension-toggle.compact .segment.active {
    background-color: hsl(5, 53%, 96%);
    color: hsl(5, 53%, 22%);
    font-weight: 600;
  }
</style>
