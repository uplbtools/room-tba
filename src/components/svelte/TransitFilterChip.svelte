<script lang="ts">
  import Bus from "@lucide/svelte/icons/bus";
  import { jeepneyStore, transitStore } from "@lib/store.svelte";
  import "./map-chrome/map-chrome.css";

  const routeCount = $derived(transitStore.routes.length);
  const isActive = $derived(jeepneyStore.layerActive);
</script>

<button
  type="button"
  class="transit-filter-chip map-chrome-chip"
  class:map-chrome-chip--toggle-active={isActive}
  aria-pressed={isActive}
  aria-label={isActive
    ? "Hide transit routes"
    : `Show transit routes, ${routeCount} routes`}
  title={isActive ? "Hide transit" : `Transit (${routeCount})`}
  onclick={() => jeepneyStore.toggleLayer()}
>
  <Bus size={14} aria-hidden="true" />
  <span>Transit</span>
  <span class="map-chrome-chip__count">{routeCount}</span>
</button>

<style>
  .transit-filter-chip {
    flex: 0 0 auto;
    min-width: 0;
  }
</style>
