<script lang="ts">
  import Bus from "@lucide/svelte/icons/bus";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import { JEEPNEY_ROUTES } from "@constants/jeepney-routes";
  import { jeepneyStore } from "@lib/store.svelte";
  import MapChromeActionChip from "@ui/map-chrome/MapChromeActionChip.svelte";
  import "@ui/map-chrome/map-chrome.css";

  const route = $derived(
    jeepneyStore.selectedRouteId
      ? (JEEPNEY_ROUTES.find((entry) => entry.id === jeepneyStore.selectedRouteId) ??
        null)
      : null,
  );

  const stopIndex = $derived(jeepneyStore.selectedStopIndex);
  const stop = $derived(
    route && stopIndex !== null ? (route.stops[stopIndex] ?? null) : null,
  );

  const mapsUrl = $derived(
    stop ? `https://www.google.com/maps?q=${stop.lat},${stop.lon}` : null,
  );

  function openPreviousStop() {
    if (route === null || stopIndex === null || stopIndex <= 0) return;
    jeepneyStore.openStop(stopIndex - 1);
  }

  function openNextStop() {
    if (route === null || stopIndex === null) return;
    if (stopIndex >= route.stops.length - 1) return;
    jeepneyStore.openStop(stopIndex + 1);
  }
</script>

{#if route && stop && stopIndex !== null}
  <div class="jeepney-stop-modal">
    <div class="jeepney-stop-modal__header">
      <span
        class="jeepney-stop-modal__route-badge"
        style:background-color={route.color}
      >
        <Bus size={14} aria-hidden="true" />
        {route.name}
      </span>
      <h2 class="jeepney-stop-modal__title">{stop.name}</h2>
      <p class="jeepney-stop-modal__meta">
        Stop {stopIndex + 1} of {route.stops.length}
      </p>
      <p class="jeepney-stop-modal__description">{route.description}</p>
    </div>

    <div class="jeepney-stop-modal__coords">
      <MapPin size={14} aria-hidden="true" />
      <span>{stop.lat.toFixed(5)}, {stop.lon.toFixed(5)}</span>
    </div>

    <div class="jeepney-stop-modal__actions">
      <MapChromeActionChip
        disabled={stopIndex <= 0}
        onclick={openPreviousStop}
      >
        Previous stop
      </MapChromeActionChip>
      <MapChromeActionChip
        disabled={stopIndex >= route.stops.length - 1}
        onclick={openNextStop}
      >
        Next stop
      </MapChromeActionChip>
      {#if mapsUrl}
        <a
          class="jeepney-stop-modal__maps-link map-chrome-action-chip"
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Maps
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      {/if}
    </div>
  </div>
{/if}

<style>
  .jeepney-stop-modal {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    padding: 0.75rem 0.875rem 1rem;
    min-width: min(100%, 22rem);
    max-width: 28rem;
  }

  .jeepney-stop-modal__header {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    min-width: 0;
  }

  .jeepney-stop-modal__route-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    align-self: flex-start;
    max-width: 100%;
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

  .jeepney-stop-modal__title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1.25;
    color: #18181b;
  }

  .jeepney-stop-modal__meta {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: hsl(0, 0%, 42%);
  }

  .jeepney-stop-modal__description {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.45;
    color: hsl(0, 0%, 38%);
  }

  .jeepney-stop-modal__coords {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: hsl(0, 0%, 45%);
  }

  .jeepney-stop-modal__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .jeepney-stop-modal__maps-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    text-decoration: none;
  }
</style>
