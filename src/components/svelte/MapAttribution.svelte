<script lang="ts">
  import Info from "@lucide/svelte/icons/info";
  import {
    DATA_LICENSE_FAQ_PATH,
    MAPTILER_COPYRIGHT_URL,
    OSM_COPYRIGHT_URL,
  } from "@constants/data-license";
  import { terrainStore } from "@lib/store.svelte";
  import "./map-chrome/map-chrome.css";

  let expanded = $state(false);

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
    <span>MapLibre</span>
    <span aria-hidden="true">|</span>
    <span>© Room TBA</span>
    <span aria-hidden="true">|</span>
    <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
      Map data © OpenStreetMap contributors
    </a>
    <span aria-hidden="true">·</span>
    <a href={MAPTILER_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
      © MapTiler
    </a>
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
      <a href={MAPTILER_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
        © MapTiler
      </a>
      <a
        href="https://openmaptiles.org/"
        target="_blank"
        rel="noopener noreferrer"
      >
        © OpenMapTiles
      </a>
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
    display: inline-flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.25rem;
    flex: 0 0 auto;
    max-width: 100%;
    margin: 0;
    padding: 0.2rem 0.4rem;
    border: none;
    border-radius: 0;
    background: rgb(255 255 255 / 0.4);
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    pointer-events: auto;
    isolation: isolate;
  }

  .map-attribution__credits {
    display: inline-flex;
    flex: 1 1 auto;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
    margin: 0;
    color: #111;
    font-family: Inter, system-ui, sans-serif;
    font-size: 0.625rem;
    font-weight: 400;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
    right: 0;
    left: auto;
    z-index: 1;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    width: min(16rem, calc(100vw - 1.5rem));
    padding: 0.375rem 0.5rem;
    border: none;
    border-radius: 0.5rem;
    background-color: #fff;
    background-clip: padding-box;
    font-size: 0.6875rem;
    line-height: 1.35;
    box-shadow: var(--shadow-results, 0 2px 6px rgb(36 37 46 / 0.2));
  }

  .map-attribution__toggle {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 1.125rem;
    height: 1.125rem;
    min-width: 1.125rem;
    min-height: 1.125rem;
    color: #5c5c5c;
    cursor: pointer;
    border-radius: 999px;
  }

  .map-attribution__toggle:hover,
  .map-attribution__toggle:focus-visible,
  .map-attribution__toggle--active {
    color: #8d1437;
  }

  .map-attribution__toggle:focus-visible {
    outline: 2px solid #8d1437;
    outline-offset: 1px;
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
    border: none;
    border-radius: 0.375rem;
    background-color: #fff;
    background-clip: padding-box;
    padding: 0.25rem 0.375rem;
    box-shadow: var(--shadow-search, 0 1px 3.5px rgb(58 58 71 / 0.2));
  }

  .maptiler-logo img {
    display: block;
    width: auto;
    height: 1.25rem;
  }
</style>
