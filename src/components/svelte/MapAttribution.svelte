<script lang="ts">
  import Info from "@lucide/svelte/icons/info";
  import {
    DATA_LICENSE_FAQ_PATH,
    MAPTILER_COPYRIGHT_URL,
    OSM_COPYRIGHT_URL,
  } from "@constants/data-license";
  import { terrainStore } from "@lib/store.svelte";
  import { onMount } from "svelte";
  import {
    getBasemapProvider,
    onBasemapProviderChange,
  } from "@lib/basemap-provider";
  import "./map-chrome/map-chrome.css";

  let expanded = $state(false);

  // Credit whoever actually served the tiles (#885). The OpenStreetMap credit
  // is required in every case; only the vendor line changes. The style loads
  // asynchronously and may fall back after this mounts, so subscribe rather
  // than read once.
  let provider = $state(getBasemapProvider());
  const servedByMaptiler = $derived(provider === "maptiler");

  onMount(() => onBasemapProviderChange((next) => (provider = next)));

  function toggleExpanded() {
    expanded = !expanded;
  }
</script>

<div
  class="map-attribution"
  class:expanded
  role="region"
  aria-label="Map attribution"
>
  <!-- Required credits visible without a click (OSMF + MapTiler terms). -->
  <p class="map-attribution__credits">
    <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
      © OpenStreetMap
    </a>
    {#if servedByMaptiler}
      <span aria-hidden="true">·</span>
      <a href={MAPTILER_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
        © MapTiler
      </a>
    {:else if provider === "openfreemap"}
      <span aria-hidden="true">·</span>
      <a
        href="https://openfreemap.org/"
        target="_blank"
        rel="noopener noreferrer"
      >
        © OpenFreeMap
      </a>
    {/if}
  </p>
  <button
    type="button"
    class="map-attribution__toggle"
    class:map-attribution__toggle--active={expanded}
    aria-expanded={expanded}
    aria-controls="map-attribution-details"
    aria-label="More map data credits"
    onclick={toggleExpanded}
  >
    <Info size={14} aria-hidden="true" />
  </button>
  {#if expanded}
    <div id="map-attribution-details" class="attrib-body">
      <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
        © OpenStreetMap contributors
      </a>
      {#if servedByMaptiler}
        <a
          href={MAPTILER_COPYRIGHT_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          © MapTiler
        </a>
        <a
          href="https://openmaptiles.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          © OpenMapTiles
        </a>
      {:else if provider === "openfreemap"}
        <a
          href="https://openfreemap.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          © OpenFreeMap
        </a>
      {/if}
      <a href={DATA_LICENSE_FAQ_PATH}>Campus data license</a>
    </div>
  {/if}
  {#if terrainStore.enabled}
    <a
      class="maptiler-logo"
      href="https://www.maptiler.com/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="MapTiler"
    >
      <img
        src="https://api.maptiler.com/resources/logo.svg"
        alt="MapTiler logo"
        width="80"
        height="20"
        decoding="async"
      />
    </a>
  {/if}
</div>

<style>
  .map-attribution {
    position: relative;
    z-index: 1;
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.25rem;
    flex: 0 0 auto;
    pointer-events: auto;
    isolation: isolate;
  }

  .map-attribution__credits {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 0.25rem;
    margin: 0;
    color: hsl(0, 0%, 22%);
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1.2;
    white-space: nowrap;
  }

  .map-attribution__credits a {
    color: inherit;
    text-decoration: none;
  }

  .map-attribution__credits a:hover,
  .map-attribution__credits a:focus-visible {
    color: hsl(5, 53%, 32%);
    text-decoration: underline;
  }

  .attrib-body {
    position: absolute;
    bottom: calc(100% + 0.375rem);
    left: 0;
    z-index: 1;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    width: min(16rem, calc(100vw - 1.5rem));
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-radius: 0.5rem;
    background-color: var(--map-chrome-surface, hsl(5 20% 97%));
    background-clip: padding-box;
    font-size: 0.6875rem;
    line-height: 1.35;
    box-shadow: 0 2px 8px hsla(0, 0%, 0%, 0.12);
  }

  .map-attribution__toggle {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    min-height: 1.5rem;
    color: hsl(0, 0%, 35%);
    cursor: pointer;
    border-radius: 0.25rem;
  }

  .map-attribution__toggle:hover,
  .map-attribution__toggle:focus-visible,
  .map-attribution__toggle--active {
    color: hsl(5, 53%, 32%);
  }

  .attrib-body a {
    color: hsl(0, 0%, 25%);
    text-decoration: none;
  }

  .attrib-body a:hover,
  .attrib-body a:focus-visible {
    text-decoration: underline;
  }

  .maptiler-logo {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-radius: 0.375rem;
    background-color: var(--map-chrome-surface, hsl(5 20% 97%));
    background-clip: padding-box;
    padding: 0.25rem 0.375rem;
    box-shadow: 0 1px 3px hsla(0, 0%, 0%, 0.1);
  }

  .maptiler-logo img {
    display: block;
    width: auto;
    height: 1.25rem;
  }
</style>
