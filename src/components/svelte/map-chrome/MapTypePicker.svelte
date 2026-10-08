<script lang="ts">
  import MapIcon from "@lucide/svelte/icons/map";
  import Satellite from "@lucide/svelte/icons/satellite";
  import { onMount } from "svelte";
  import {
    getBasemapProvider,
    onBasemapProviderChange,
  } from "@lib/basemap-provider";
  import { mapViewStore } from "@lib/store.svelte";

  /**
   * Map type tiles at the top of the Layers sheet, Google Maps style: one
   * exclusive choice between the Default basemap and Satellite. 3D is a
   * camera tilt that works on either, so it lives in Map details as a
   * switch instead of posing as a third map type.
   */

  type Props = {
    /** Id of the section label that names this group. */
    labelledBy?: string;
  };

  let { labelledBy }: Props = $props();

  // Satellite tiles need a working MapTiler key. Gate on the provider that
  // actually served the basemap: a rejected key (#863) falls back to a
  // keyless basemap, and satellite would 403 the same way.
  let basemapProvider = $state(getBasemapProvider());
  onMount(() => onBasemapProviderChange((next) => (basemapProvider = next)));
  const satelliteAvailable = $derived(basemapProvider === "maptiler");

  const options = $derived([
    { id: "default", label: "Default", icon: MapIcon, disabled: false },
    {
      id: "satellite",
      label: "Satellite",
      icon: Satellite,
      disabled: !satelliteAvailable,
    },
  ] as const);

  const selected = $derived(mapViewStore.satellite ? "satellite" : "default");

  function choose(id: "default" | "satellite") {
    const on = id === "satellite";
    if (on && !satelliteAvailable) return;
    if (mapViewStore.satellite !== on) mapViewStore.toggleSatellite();
  }

  let groupEl = $state<HTMLDivElement | null>(null);

  function handleKeydown(event: KeyboardEvent) {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !back) return;
    event.preventDefault();
    const enabled = options.filter((option) => !option.disabled);
    const index = enabled.findIndex((option) => option.id === selected);
    const next =
      enabled[(index + (forward ? 1 : -1) + enabled.length) % enabled.length];
    if (!next) return;
    choose(next.id);
    queueMicrotask(() =>
      groupEl
        ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
        ?.focus(),
    );
  }
</script>

<div class="map-type-picker">
  <div
    bind:this={groupEl}
    class="map-type-picker__tiles"
    role="radiogroup"
    aria-labelledby={labelledBy}
    aria-label={labelledBy ? undefined : "Map type"}
    tabindex="-1"
    onkeydown={handleKeydown}
  >
    {#each options as option (option.id)}
      {@const checked = selected === option.id}
      <button
        type="button"
        role="radio"
        class="map-type-tile"
        aria-checked={checked}
        aria-describedby={option.disabled ? "map-type-satellite-reason" : undefined}
        tabindex={checked ? 0 : -1}
        disabled={option.disabled}
        onclick={() => choose(option.id)}
      >
        <span class="map-type-tile__swatch map-type-tile__swatch--{option.id}">
          <option.icon size={24} aria-hidden="true" />
        </span>
        <span class="map-type-tile__label">{option.label}</span>
      </button>
    {/each}
  </div>
  {#if !satelliteAvailable}
    <p id="map-type-satellite-reason" class="map-type-picker__reason">
      Satellite imagery is unavailable on this map right now.
    </p>
  {/if}
</div>

<style>
  .map-type-picker {
    display: grid;
    gap: 0.5rem;
    padding: 0 1rem;
  }

  .map-type-picker__tiles {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 5.5rem));
    gap: 1rem;
  }

  .map-type-picker__tiles:focus {
    outline: none;
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

  .map-type-tile:disabled {
    cursor: default;
    opacity: 0.38;
  }

  /* The selection ring is drawn inside the swatch box (inset shadow plus a
     border the same size in both states), so selecting a tile never grows
     it past the sheet's padding and no edge gets clipped. */
  .map-type-tile__swatch {
    box-sizing: border-box;
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 1;
    border: 3px solid transparent;
    border-radius: 0.75rem;
    box-shadow: inset 0 0 0 1px var(--theme-border, hsl(0, 0%, 85%));
  }

  .map-type-tile__swatch--default {
    background: linear-gradient(135deg, #eef4ec 0 55%, #c5c5c0 55% 62%, #8fbf8a 62%);
    color: #7b1113;
  }

  .map-type-tile__swatch--satellite {
    background: linear-gradient(135deg, #3f5a36 0 45%, #8a8476 45% 52%, #24401f 52%);
    color: #fff;
  }

  /* Dark basemap preview: dark land, muted road, deep green, with a light
     icon so it keeps contrast on the darker swatch. */
  :global(:root[data-theme="dark"]) .map-type-tile__swatch--default {
    background: linear-gradient(135deg, #2b2a2c 0 55%, #4c4a4d 55% 62%, #2f4a32 62%);
    color: #f2a69c;
  }

  :global(:root[data-theme="dark"]) .map-type-tile__swatch--satellite {
    background: linear-gradient(135deg, #22321d 0 45%, #55514a 45% 52%, #121f10 52%);
  }

  .map-type-tile[aria-checked="true"] .map-type-tile__swatch {
    border-color: var(--theme-accent-fill, #7b1113);
    box-shadow: none;
  }

  :global(:root[data-theme="dark"])
    .map-type-tile[aria-checked="true"]
    .map-type-tile__swatch {
    border-color: var(--theme-accent-text, #f2a69c);
  }

  .map-type-tile[aria-checked="true"] .map-type-tile__label {
    color: var(--theme-accent-text, #7b1113);
    font-weight: 600;
  }

  .map-type-tile:focus-visible {
    outline: none;
  }

  .map-type-tile:focus-visible .map-type-tile__swatch {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: 2px;
  }

  .map-type-tile__label {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .map-type-picker__reason {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: var(--theme-text-2, hsl(0, 0%, 32%));
  }
</style>
