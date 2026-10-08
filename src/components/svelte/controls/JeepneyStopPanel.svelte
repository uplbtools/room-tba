<script lang="ts">
  import Bus from "@lucide/svelte/icons/bus";
  import PersonStanding from "@lucide/svelte/icons/person-standing";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import EntityPanelClose from "./EntityPanelClose.svelte";
  import EntityGoogleMapsLink from "./EntityGoogleMapsLink.svelte";
  import EntityDirectionsChip from "./EntityDirectionsChip.svelte";
  import EntityShareCopyLink from "./EntityShareCopyLink.svelte";
  import TransitStopEditor from "./TransitStopEditor.svelte";
  import JeepStopReports from "./JeepStopReports.svelte";
  import { getGoogleStreetViewUrl } from "@lib/google-maps-links";
  import { getJeepneyRouteShareUrl } from "@lib/share-links";
  import MapChromeActionLink from "@ui/map-chrome/MapChromeActionLink.svelte";
  import {
    jeepneyStore,
    queryStore,
    sidePanelStore,
    transitStore,
  } from "@lib/store.svelte";
  import { openCampusBrowse } from "@lib/browse-campus";
  import { isRoutePanelQuery } from "@lib/transit-route-visibility";
  import { darkenForWhiteText } from "@lib/color-contrast";
  import { distinctStopCount, isLoopRoute } from "@lib/transit-route-kind";
  import { activeDirection, routesAtStop } from "@lib/transit-direction";
  import { getTransitRoutePath } from "@lib/transit-urls";
  import MapChromeActionChip from "@ui/map-chrome/MapChromeActionChip.svelte";
  import "@ui/map-chrome/map-chrome.css";

  // Oriented like the route page, so stop N here is pin N on the map.
  const route = $derived(
    transitStore.displayRoute(jeepneyStore.selectedRouteId),
  );

  const stopIndex = $derived(jeepneyStore.selectedStopIndex);
  const stop = $derived(
    route && stopIndex !== null ? (route.stops[stopIndex] ?? null) : null,
  );

  const mapsUrl = $derived(stop ? { lat: stop.lat, lon: stop.lon } : null);
  const loop = $derived(route ? isLoopRoute(route) : false);
  const atLoopEnd = $derived(
    loop && route !== null && stopIndex === route.stops.length - 1,
  );
  const stopPosition = $derived(
    route === null || stopIndex === null
      ? ""
      : atLoopEnd
        ? "End of the loop (back at stop 1)"
        : `Stop ${stopIndex + 1} of ${distinctStopCount(route)}${loop ? " on the loop" : ""}`,
  );

  const direction = $derived(
    route ? activeDirection(route.id, transitStore.isReversed(route.id)) : null,
  );

  /** Every route serving this kerb, the open one first. */
  const servingRoutes = $derived.by(() => {
    if (!route || !stop) return [];
    return routesAtStop(transitStore.routes, stop).sort(
      (a, b) =>
        Number(b.route.id === route.id) - Number(a.route.id === route.id),
    );
  });

  function openServingRoute(event: MouseEvent, id: string) {
    // Plain clicks stay in the app; modified clicks open the link normally.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
      return;
    event.preventDefault();
    // The route shows in the route panel; a stop opened over a pinned route
    // (or another list) has none behind it yet.
    if (!isRoutePanelQuery(queryStore.category, queryStore.queryValue)) {
      openCampusBrowse(queryStore, sidePanelStore, "jeepney");
    }
    jeepneyStore.openRouteOnMap(id);
    jeepneyStore.closeStop();
  }

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

  function openRouteDetails() {
    if (!route) return;
    jeepneyStore.closeStop();
  }
</script>

{#if route && stop && stopIndex !== null}
  <div class="entity-detail jeepney-stop-panel">
    <header class="entity-header">
      <div class="entity-panel-header-top">
        <span
          class="jeepney-stop-panel__route-badge"
          style:background-color={darkenForWhiteText(route.color)}
        >
          <Bus size={14} aria-hidden="true" />
          {route.name}
        </span>
        <EntityPanelClose ariaLabel="Close stop details" onclick={closeStop} />
      </div>
      <h2 class="entity-header__title">{stop.name}</h2>
      <p class="entity-header__context">
        {stopPosition}{direction ? `, ${direction.label}` : ""}
      </p>
      <MapChromeActionChip toolbar onclick={openRouteDetails}>
        <ChevronLeft size={14} aria-hidden="true" />
        Back to {route.name} route
      </MapChromeActionChip>
    </header>

    {#if servingRoutes.length > 0}
      <section class="jeepney-stop-panel__serving" aria-label="Routes at this stop">
        <h3 class="jeepney-stop-panel__serving-title">Routes at this stop</h3>
        <ul class="jeepney-stop-panel__chips">
          {#each servingRoutes as entry (entry.route.id)}
            <li>
              <a
                class="jeepney-stop-panel__chip"
                href={getTransitRoutePath(entry.route.id)}
                aria-current={entry.route.id === route.id ? "page" : undefined}
                onclick={(event) => openServingRoute(event, entry.route.id)}
              >
                <span
                  class="jeepney-stop-panel__chip-dot"
                  style:background-color={entry.route.color}
                  aria-hidden="true"
                ></span>
                <span class="jeepney-stop-panel__chip-name"
                  >{entry.route.name}</span
                >
                <span class="jeepney-stop-panel__chip-direction"
                  >{entry.direction}</span
                >
              </a>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <!-- Right under the header: in the half-open phone sheet these sat below
         the descriptions, out of reach without dragging the sheet up. -->
    <div class="entity-actions">
      <div class="jeepney-stop-panel__pager" aria-label="Route stops">
        <MapChromeActionChip
          toolbar
          disabled={stopIndex <= 0}
          onclick={openPreviousStop}
        >
          <ChevronLeft size={14} aria-hidden="true" />
          Previous stop
        </MapChromeActionChip>
        <MapChromeActionChip
          toolbar
          disabled={stopIndex >= route.stops.length - 1}
          onclick={openNextStop}
        >
          Next stop
          <ChevronRight size={14} aria-hidden="true" />
        </MapChromeActionChip>
      </div>
      {#if mapsUrl}
        <EntityDirectionsChip
          lat={mapsUrl.lat}
          lon={mapsUrl.lon}
          destinationLabel={stop.name}
        />
        <EntityGoogleMapsLink
          lat={mapsUrl.lat}
          lon={mapsUrl.lon}
          name={stop.name}
          ariaLabel={`Open ${stop.name} in Google Maps`}
        />
        <MapChromeActionLink
          href={getGoogleStreetViewUrl(mapsUrl.lat, mapsUrl.lon)}
          ariaLabel={`Open ${stop.name} in Google Street View`}
          toolbar
        >
          <PersonStanding size={14} aria-hidden="true" />
          Street View
        </MapChromeActionLink>
      {/if}
      <EntityShareCopyLink
        url={getJeepneyRouteShareUrl(route.id, stopIndex, route)}
        entityLabel={stop.name}
      />
    </div>

    <JeepStopReports entries={servingRoutes} />

    <p class="entity-directions__text">{stop.description}</p>
    <p class="entity-panel-note">{route.description}</p>

    <p class="jeepney-stop-panel__coords">
      <MapPin size={14} aria-hidden="true" />
      <span>{stop.lat.toFixed(5)}, {stop.lon.toFixed(5)}</span>
    </p>

    {#key stop.id ?? stopIndex}
      <TransitStopEditor
        routeId={route.id}
        routeName={route.name}
        {stop}
        onRemoved={closeStop}
      />
    {/key}

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

  .jeepney-stop-panel__serving {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    min-width: 0;
  }

  .jeepney-stop-panel__serving-title {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .jeepney-stop-panel__chips {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    min-width: 0;
  }

  .jeepney-stop-panel__chips li {
    min-width: 0;
    max-width: 100%;
  }

  .jeepney-stop-panel__chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    max-width: 100%;
    min-height: 2.25rem;
    box-sizing: border-box;
    padding: 0.25rem 0.625rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 84%));
    border-radius: 999px;
    background: var(--theme-surface, white);
    color: var(--theme-text, hsl(0, 0%, 12%));
    font-size: 0.8125rem;
    text-decoration: none;
  }

  .jeepney-stop-panel__chip:hover {
    border-color: var(--theme-accent-border, hsl(5, 40%, 72%));
    background: var(--theme-accent-soft, hsl(5, 53%, 98%));
  }

  .jeepney-stop-panel__chip:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: 1px;
  }

  .jeepney-stop-panel__chip[aria-current="page"] {
    border-color: var(--theme-accent-text, hsl(5, 53%, 32%));
    background: var(--theme-accent-soft, hsl(5, 53%, 96%));
  }

  .jeepney-stop-panel__chip-dot {
    flex-shrink: 0;
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 50%;
  }

  .jeepney-stop-panel__chip-name {
    font-weight: 700;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .jeepney-stop-panel__chip-direction {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
    font-size: 0.75rem;
  }

  .jeepney-stop-panel__coords {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--theme-text-2, #71717a);
  }

  .jeepney-stop-panel__pager {
    display: inline-flex;
    gap: 0.25rem;
    padding-right: 0.5rem;
    border-right: 1px solid var(--theme-border, hsl(0 0% 86%));
  }

  @media (max-width: 30rem) {
    .jeepney-stop-panel__pager {
      width: 100%;
      padding: 0 0 0.5rem;
      border: 0;
      border-bottom: 1px solid var(--theme-border, hsl(0 0% 86%));
    }
  }

</style>
