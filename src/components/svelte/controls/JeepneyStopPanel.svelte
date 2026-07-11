<script lang="ts">
  import Bus from "@lucide/svelte/icons/bus";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import EntityPanelClose from "./EntityPanelClose.svelte";
  import EntityGoogleMapsLink from "./EntityGoogleMapsLink.svelte";
  import EntityShareCopyLink from "./EntityShareCopyLink.svelte";
  import { JEEPNEY_ROUTES } from "@constants/jeepney-routes";
  import { getJeepneyRouteShareUrl } from "@lib/share-links";
  import { jeepneyStore } from "@lib/store.svelte";
  import MapChromeActionChip from "@ui/map-chrome/MapChromeActionChip.svelte";
  import "@ui/map-chrome/map-chrome.css";

  const route = $derived(
    jeepneyStore.selectedRouteId
      ? (JEEPNEY_ROUTES.find(
          (entry) => entry.id === jeepneyStore.selectedRouteId,
        ) ?? null)
      : null,
  );

  const stopIndex = $derived(jeepneyStore.selectedStopIndex);
  const stop = $derived(
    route && stopIndex !== null ? (route.stops[stopIndex] ?? null) : null,
  );

  const mapsUrl = $derived(stop ? { lat: stop.lat, lon: stop.lon } : null);

  function openPreviousStop() {
    if (route === null || stopIndex === null || stopIndex <= 0) return;
    jeepneyStore.openStop(stopIndex - 1);
  }

  function openNextStop() {
    if (route === null || stopIndex === null) return;
    if (stopIndex >= route.stops.length - 1) return;
    jeepneyStore.openStop(stopIndex + 1);
  }

  function closeStop() {
    jeepneyStore.closeStop();
  }
</script>

{#if route && stop && stopIndex !== null}
  <div class="entity-detail jeepney-stop-panel">
    <header class="entity-header">
      <div class="entity-panel-header-top">
        <span
          class="jeepney-stop-panel__route-badge"
          style:background-color={route.color}
        >
          <Bus size={14} aria-hidden="true" />
          {route.name}
        </span>
        <EntityPanelClose ariaLabel="Close stop details" onclick={closeStop} />
      </div>
      <h2 class="entity-header__title">{stop.name}</h2>
      <p class="entity-header__context">
        Stop {stopIndex + 1} of {route.stops.length}
      </p>
    </header>

    <details class="entity-details-collapse">
      <summary>About this route</summary>
      <div class="entity-details-collapse__body">
        <p class="entity-panel-note">{route.description}</p>
        <button
          type="button"
          class="jeepney-stop-panel__route-link"
          onclick={() => jeepneyStore.openRouteModal(route.id)}
        >
          View full route details
        </button>
      </div>
    </details>

    <p class="jeepney-stop-panel__coords">
      <MapPin size={14} aria-hidden="true" />
      <span>{stop.lat.toFixed(5)}, {stop.lon.toFixed(5)}</span>
    </p>

    <div class="entity-actions">
      <MapChromeActionChip
        toolbar
        disabled={stopIndex <= 0}
        onclick={openPreviousStop}
      >
        Previous stop
      </MapChromeActionChip>
      <MapChromeActionChip
        toolbar
        disabled={stopIndex >= route.stops.length - 1}
        onclick={openNextStop}
      >
        Next stop
      </MapChromeActionChip>
      {#if mapsUrl}
        <EntityGoogleMapsLink
          lat={mapsUrl.lat}
          lon={mapsUrl.lon}
          ariaLabel={`Open ${stop.name} in Google Maps`}
        />
      {/if}
      <EntityShareCopyLink
        url={getJeepneyRouteShareUrl(route.id, stopIndex)}
        entityLabel={stop.name}
      />
    </div>
  </div>
{/if}

<style>
  @import "./entity-detail.css";

  .jeepney-stop-panel {
    min-width: 0;
    padding: 0.125rem 0;
  }

  .jeepney-stop-panel__route-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    align-self: flex-start;
    max-width: calc(100% - 6rem);
    padding: 0.1875rem 0.5rem;
    border-radius: 999px;
    color: white;
    font-size: 0.6875rem;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .jeepney-stop-panel__coords {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: #71717a;
  }

  .jeepney-stop-panel__route-link {
    margin-top: 0.375rem;
    padding: 0;
    border: none;
    background: none;
    color: hsl(5, 53%, 32%);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
  }
</style>
