<script lang="ts">
  import { terrainStore } from "@lib/store.svelte";

  let expanded = $state(false);

  function toggleExpanded() {
    expanded = !expanded;
  }
</script>

<div class="map-attribution" class:expanded>
  <button
    type="button"
    class="attrib-toggle"
    aria-expanded={expanded}
    aria-controls="map-attribution-details"
    onclick={toggleExpanded}
  >
    {#if expanded}
      Hide map data
    {:else}
      Map data
    {/if}
  </button>
  {#if expanded}
    <div id="map-attribution-details" class="attrib-body">
      <a
        href="https://www.maptiler.com/copyright/"
        target="_blank"
        rel="noopener noreferrer"
      >
        © MapTiler
      </a>
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
      >
        © OpenStreetMap contributors
      </a>
      <a
        href="https://openmaptiles.org/"
        target="_blank"
        rel="noopener noreferrer"
      >
        © OpenMapTiles
      </a>
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
      />
    </a>
  {/if}
</div>

<style>
  .map-attribution {
    position: relative;
    z-index: 15;
    display: flex;
    flex-wrap: nowrap;
    align-items: flex-end;
    gap: 0.375rem;
    flex: 0 0 auto;
    max-width: calc(100% - var(--bottom-fab-inset, 0px));
    pointer-events: auto;
  }

  .attrib-toggle {
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.92);
    color: hsl(0, 0%, 20%);
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1.2;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  }

  .attrib-toggle:hover,
  .attrib-toggle:focus-visible {
    background: #fff;
    outline: 2px solid #7b1113;
    outline-offset: 1px;
  }

  .attrib-body {
    position: absolute;
    bottom: calc(100% + 0.375rem);
    left: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    width: min(16rem, calc(100vw - var(--bottom-fab-inset, 0px) - 1.5rem));
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.96);
    font-size: 0.6875rem;
    line-height: 1.35;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.14);
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
    display: inline-flex;
    align-items: center;
    border-radius: 0.375rem;
    background-color: rgba(255, 255, 255, 0.92);
    padding: 0.25rem 0.375rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
  }

  .maptiler-logo img {
    display: block;
    width: auto;
    height: 1.25rem;
  }

  @media (max-width: 48rem) {
    .map-attribution {
      margin-left: 0.5rem;
      margin-bottom: 0.25rem;
      order: -1;
    }
  }
</style>
