<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import X from "@lucide/svelte/icons/x";
  import MapPinned from "@lucide/svelte/icons/map-pinned";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Clock from "@lucide/svelte/icons/clock";
  import Banknote from "@lucide/svelte/icons/banknote";
  import {
    adminAuthStore,
    jeepneyStore,
    modalStore,
    queryStore,
    sidePanelStore,
    transitStore,
  } from "@lib/store.svelte";
  import { openCampusBrowse } from "@lib/browse-campus";
  import {
    JEEPNEY_RIDING_NOTES,
    ROUTE_BOARDING_NOTES,
    TOWN_JEEPNEY_RIDING_NOTES,
    TRANSIT_DATA_CREDIT,
    resolveRouteGeometry,
    type StoredRouteGeometry,
  } from "@constants/jeepney-routes";
  import jeepneyGeometries from "@constants/jeepney-geometries.json";
  import { getJeepneyRouteShareUrl } from "@lib/share-links";
  import { darkenForWhiteText } from "@lib/color-contrast";
  import {
    distinctStopCount,
    isLoopRoute,
    routeFareInfo,
    transitRouteKind,
    transitRouteNoun,
  } from "@lib/transit-route-kind";
  import { routeDirections } from "@lib/transit-direction";
  import { routeScheduleSummary } from "@lib/transit-schedule";
  import Radio from "@lucide/svelte/icons/radio";
  import { routeReportLine } from "@lib/transit-reports";
  import {
    type ReportsResponse,
    fetchRouteReports,
  } from "@lib/transit-reports-client";
  import EntityShareCopyLink from "../controls/EntityShareCopyLink.svelte";
  import Printer from "@lucide/svelte/icons/printer";
  import MapChromeActionLink from "@ui/map-chrome/MapChromeActionLink.svelte";
  import TransitStopEditor from "../controls/TransitStopEditor.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import EntityEditorToggle from "../editor/EntityEditorToggle.svelte";

  type Props = {
    routeId?: string | null;
    onback?: () => void;
    /** Leave the route view entirely and return to the plain map. */
    onclose?: () => void;
  };

  let { routeId = null, onback, onclose }: Props = $props();

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape" || !onclose || event.defaultPrevented) return;
    // Let a focused field (stop editor) handle its own Escape.
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest("input, textarea, select, [contenteditable]")
    ) {
      return;
    }
    onclose();
  }

  // In the direction the rider picked, so stop numbers match the map pins.
  const route = $derived(
    transitStore.displayRoute(routeId ?? jeepneyStore.modalRouteId),
  );
  const directions = $derived(route ? routeDirections(route.id) : null);
  const reversed = $derived(route ? transitStore.isReversed(route.id) : false);
  const schedule = $derived(route ? routeScheduleSummary(route.id) : null);

  // Campus fares, tips and the transit-map credit are about campus jeeps;
  // buses and town jeeps get their own (or none).
  const kind = $derived(route ? transitRouteKind(route) : "campus");
  let suggestOpen = $state(false);
  const fare = $derived(route ? routeFareInfo(route) : null);
  const ridingNotes = $derived(
    kind === "campus"
      ? JEEPNEY_RIDING_NOTES
      : kind === "town"
        ? TOWN_JEEPNEY_RIDING_NOTES
        : [],
  );
  const loop = $derived(route ? isLoopRoute(route) : false);

  // Say so when the drawn line is inferred rather than traced from the
  // operator's mapped route; riders plan around these lines.
  const geometryNote = $derived(
    route
      ? resolveRouteGeometry(
          route,
          jeepneyGeometries as Record<string, StoredRouteGeometry>,
        ).caveat
      : null,
  );

  // Rider reports from the last hour; null (no line at all) until loaded or
  // when the request fails, so a failure never reads as "No recent reports".
  let routeReports = $state<ReportsResponse | null>(null);
  let reportsNow = $state(Date.now());
  const routeIdForReports = $derived(route?.id ?? null);

  $effect(() => {
    const id = routeIdForReports;
    routeReports = null;
    if (!id) return;
    let cancelled = false;
    const load = () =>
      fetchRouteReports(id).then((result) => {
        if (cancelled) return;
        routeReports = result;
        reportsNow = Date.now();
      });
    void load();
    const poll = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  });

  const reportLine = $derived(
    route && routeReports
      ? routeReportLine(
          routeReports.reports,
          route.stops,
          reportsNow + routeReports.skewMs,
        )
      : null,
  );

  function setDirection(reverse: boolean) {
    if (route) transitStore.setReversed(route.id, reverse);
  }

  function viewOnMap() {
    if (!route) return;
    // Into the route panel: a drawn route lives only as long as its panel.
    openCampusBrowse(queryStore, sidePanelStore, "jeepney");
    jeepneyStore.openRouteOnMap(route.id);
    modalStore.closeModal();
  }

  function showStop(index: number) {
    if (!route) return;
    // openStop bails when no route is selected on the map, and openRouteOnMap
    // clears the stop when the route changes, so the route has to come first.
    // The side-panel copy (routeId set) is already showing this route, and its
    // container swaps to JeepneyStopPanel on its own, so there is nothing to
    // select and no modal to dismiss.
    if (routeId === null) {
      openCampusBrowse(queryStore, sidePanelStore, "jeepney");
      jeepneyStore.openRouteOnMap(route.id);
      modalStore.closeModal();
    }
    jeepneyStore.openStop(index);
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if route}
  <div
    class="jeepney-modal"
    class:jeepney-modal--sheet={!onback && !onclose}
    style:--route-color={darkenForWhiteText(route.color)}
  >
    {#if onback || onclose}
      <div class="jeepney-modal__nav">
        {#if onback}
          <button type="button" class="jeepney-modal__back" onclick={onback}>
            <ChevronLeft size={16} aria-hidden="true" />
            All routes
          </button>
        {/if}
        {#if onclose}
          <button
            type="button"
            class="jeepney-modal__close"
            onclick={onclose}
            aria-label="Close route and return to the map"
          >
            <X size={18} aria-hidden="true" />
          </button>
        {/if}
      </div>
    {/if}
    {#if onback || onclose}
      <header class="jeepney-modal__header">
        <span
          class="jeepney-modal__swatch"
          style:background-color={route.color}
          aria-hidden="true"
        ></span>
        <h2 class="jeepney-modal__title">{route.name} {transitRouteNoun(route)}</h2>
      </header>
    {:else}
      <!-- Opened as a modal: the standard top app bar (X at the top-left). -->
      <ModalHeader title={`${route.name} ${transitRouteNoun(route)}`} />
    {/if}

    <div class="jeepney-modal__scroll map-chrome-scroll">
      {#if directions}
        <div class="jeepney-modal__directions">
          <div
            class="jeepney-modal__segmented"
            role="group"
            aria-label="Direction"
          >
            {#each [false, true] as isReverse (isReverse)}
              {@const direction = isReverse
                ? directions.reverse
                : directions.forward}
              <button
                type="button"
                class="jeepney-modal__segment"
                aria-pressed={reversed === isReverse}
                onclick={() => setDirection(isReverse)}
                >{direction.label}</button
              >
            {/each}
          </div>
          <p class="jeepney-modal__direction-summary">
            {reversed ? directions.reverse.summary : directions.forward.summary}
          </p>
        </div>
      {/if}

      <ul class="jeepney-modal__facts">
        <li>
          <Banknote size={16} aria-hidden="true" />
          {#if fare?.kind === "ticketed"}
            <span
              >Buy tickets on the
              <a
                href={fare.ticketing.url}
                target="_blank"
                rel="noopener noreferrer">{fare.ticketing.operator} website</a
              >, which also lists the current fare.</span
            >
          {:else if fare?.kind === "fixed" || fare?.kind === "end-to-end"}
            <span
              >{fare.kind === "end-to-end" ? "Whole route " : ""}<strong
                >₱{fare.fare.regular}</strong
              >
              regular, <strong>₱{fare.fare.discounted}</strong> student / PWD / senior</span
            >
          {:else if fare?.kind === "distance"}
            <span
              >Minimum fare <strong>₱{fare.minimum.regular}</strong>
              regular, <strong>₱{fare.minimum.discounted}</strong> student / PWD / senior</span
            >
          {:else if fare}
            <span>{fare.note}</span>
          {/if}
        </li>
        {#if schedule}
          <li>
            <Clock size={16} aria-hidden="true" />
            <span
              >{schedule.hours}{schedule.published
                ? `, ${schedule.frequency}`
                : ""}{schedule.note ? `. ${schedule.note}` : ""}</span
            >
          </li>
        {/if}
        {#if reportLine}
          <li class="jeepney-modal__reports">
            <Radio size={16} aria-hidden="true" />
            <span
              >{reportLine.last}{reportLine.frequency
                ? `. ${reportLine.frequency}`
                : ""}</span
            >
          </li>
        {/if}
      </ul>

      <h3 class="jeepney-modal__stops-title">
        Stops <span
          >({distinctStopCount(route)}{loop ? ", loop" : ""})</span
        >
      </h3>
      <ol class="jeepney-modal__stops">
        {#each route.stops as stop, i (`${route.id}-${i}`)}
          <li
            class:jeepney-modal__terminal={i === 0 ||
              i === route.stops.length - 1}
          >
            <button
              type="button"
              class="jeepney-modal__stop"
              onclick={() => showStop(i)}
            >
              <span class="jeepney-modal__stop-index"
                >{loop && i === route.stops.length - 1 ? 1 : i + 1}</span
              >
              <span class="jeepney-modal__stop-name"
                >{stop.name}{loop && i === route.stops.length - 1
                  ? " (back to the start)"
                  : ""}</span
              >
            </button>
          </li>
        {/each}
      </ol>

      {#if ROUTE_BOARDING_NOTES[route.id]}
        <p class="jeepney-modal__boarding">
          <MapPin size={16} aria-hidden="true" />
          <span>{ROUTE_BOARDING_NOTES[route.id]}</span>
        </p>
      {/if}

      <details class="jeepney-modal__about">
        <summary>About this route</summary>
        <p>{route.description}</p>
        {#if route.directionNote}
          <p>{route.directionNote}</p>
        {/if}
        {#if fare && fare.kind !== "ticketed" && fare.kind !== "unverified"}
          <p class="jeepney-modal__fare-note">{fare.note}</p>
        {/if}
        {#if geometryNote}
          <p class="jeepney-modal__geometry-note">{geometryNote}</p>
        {/if}
        {#if ridingNotes.length > 0}
          <h3 class="jeepney-modal__stops-title">Riding tips</h3>
          <ul class="jeepney-modal__tips">
            {#each ridingNotes as note (note)}
              <li>{note}</li>
            {/each}
          </ul>
        {/if}
        {#if kind === "campus"}
          <p class="jeepney-modal__credit">{TRANSIT_DATA_CREDIT}</p>
        {/if}
      </details>

      <TransitStopEditor
        routeId={route.id}
        routeName={route.name}
        bind:expanded={suggestOpen}
        showToggle={false}
      />
    </div>

    <!-- One footer row, one button style: the suggest toggle used to sit in
         the scroller above a divider, with Copy link alone on the far side. -->
    <div class="jeepney-modal__actions">
      <EntityEditorToggle
        variant="toolbar"
        expanded={suggestOpen}
        canPublish={adminAuthStore.canPublish}
        publishOpenLabel="Add stop"
        suggestOpenLabel="Suggest a stop"
        onclick={() => (suggestOpen = !suggestOpen)}
      />
      <EntityShareCopyLink
        url={getJeepneyRouteShareUrl(route.id)}
        entityLabel={`${route.name} route`}
      />
      <MapChromeActionLink
        href="/api/transit-map"
        ariaLabel="Printable transit map (PDF)"
        toolbar
      >
        <Printer size={14} aria-hidden="true" />
        Printable map
      </MapChromeActionLink>
      {#if routeId === null}
        <button type="button" class="jeepney-modal__view" onclick={viewOnMap}>
          <MapPinned size={16} aria-hidden="true" />
          View on map
        </button>
      {/if}
    </div>
  </div>
{:else}
  <p class="jeepney-modal__empty">This route is no longer available.</p>
{/if}

<style>
  .jeepney-modal {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem 0.5rem 0.25rem;
    flex: 1 1 auto;
    min-height: 0;
  }

  /* In a Dialog the top app bar runs edge to edge; the body keeps the
     16px side gutter every modal screen uses. */
  .jeepney-modal--sheet {
    padding: 0;
  }

  .jeepney-modal--sheet .jeepney-modal__scroll {
    padding: 0 1rem 0.5rem;
  }

  .jeepney-modal--sheet .jeepney-modal__actions {
    padding: 0 1rem 0.75rem;
  }

  .jeepney-modal__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-right: 2.25rem;
  }

  .jeepney-modal__back {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    min-height: 2.75rem;
    padding-right: 0.5rem;
    gap: 0.25rem;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 700;
  }

  .jeepney-modal__nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .jeepney-modal__close {
    all: unset;
    display: inline-grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    margin: -0.5rem -0.5rem -0.5rem auto;
    border-radius: 999px;
    color: var(--theme-text, hsl(5, 12%, 30%));
    cursor: pointer;
  }

  .jeepney-modal__close:hover {
    background: var(--theme-accent-soft, hsl(5, 53%, 96%));
  }

  .jeepney-modal__close:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: -2px;
  }

  .jeepney-modal__back:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: -2px;
    border-radius: 0.25rem;
  }

  .jeepney-modal__swatch {
    width: 0.875rem;
    height: 0.875rem;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .jeepney-modal__title {
    margin: 0;
    font-size: 1.0625rem;
    font-weight: 700;
    color: var(--theme-text, hsl(0, 0%, 15%));
  }

  .jeepney-modal__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-right: 0.375rem;
  }

  /* Kaliwa / Kanan: one loop, two directions; the toggle reorders the stops
     and flips the map line. */
  .jeepney-modal__directions {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .jeepney-modal__segmented {
    display: flex;
    padding: 0.1875rem;
    border-radius: 999px;
    background: var(--theme-surface-2, hsl(0, 0%, 94%));
  }

  .jeepney-modal__segment {
    flex: 1 1 0;
    min-height: 2.25rem;
    padding: 0 0.75rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--theme-text, hsl(0, 0%, 28%));
    cursor: pointer;
  }

  .jeepney-modal__segment[aria-pressed="true"] {
    background: var(--theme-surface, white);
    color: var(--route-color, var(--theme-accent-text, hsl(5, 53%, 32%)));
    box-shadow: 0 1px 3px hsla(0, 0%, 0%, 0.18);
  }

  .jeepney-modal__segment:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: 1px;
  }

  .jeepney-modal__direction-summary {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--theme-text-2, hsl(0, 0%, 32%));
  }

  .jeepney-modal__facts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .jeepney-modal__facts li,
  .jeepney-modal__boarding {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: var(--theme-text, hsl(0, 0%, 20%));
  }

  .jeepney-modal__facts :global(svg),
  .jeepney-modal__boarding :global(svg) {
    flex-shrink: 0;
    margin-top: 0.0625rem;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .jeepney-modal__facts strong {
    font-weight: 700;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }

  .jeepney-modal__facts a {
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    font-weight: 600;
  }

  .jeepney-modal__about {
    border-top: 1px solid var(--theme-border, hsl(0, 0%, 92%));
    padding-top: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--theme-text, hsl(0, 0%, 15%));
  }

  .jeepney-modal__about summary {
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    padding: 0.375rem 0;
  }

  .jeepney-modal__about[open] summary {
    margin-bottom: 0.25rem;
  }

  .jeepney-modal__about > p,
  .jeepney-modal__about > ul {
    margin: 0 0 0.5rem;
  }

  .jeepney-modal__fare-note {
    margin: 0;
    font-size: 0.75rem;
    color: var(--theme-text-2, hsl(0, 0%, 32%));
  }

  .jeepney-modal__tips {
    margin: 0;
    padding-left: 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: var(--theme-text, hsl(0, 0%, 24%));
  }

  .jeepney-modal__credit {
    margin: 0;
    font-size: 0.6875rem;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
  }

  .jeepney-modal__geometry-note {
    margin: 0;
    padding-left: 0.5rem;
    border-left: 2px solid var(--theme-border, hsl(0, 0%, 78%));
    font-size: 0.75rem;
    line-height: 1.45;
    color: var(--theme-text-2, hsl(0, 0%, 32%));
  }

  .jeepney-modal__stops-title {
    margin: 0.25rem 0 0;
    font-size: 0.8125rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .jeepney-modal__stops-title span {
    color: var(--theme-text-muted, hsl(0, 0%, 60%));
  }

  /* Metro-map style: numbered dots in the route color, joined by a line. */
  .jeepney-modal__stops {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  /* Stays the positioning context for the connector line and the index badge;
     the button inside is the actual row. */
  .jeepney-modal__stops li {
    position: relative;
    display: flex;
  }

  /* Global `button { all: unset }` means every box property is re-stated. */
  .jeepney-modal__stop {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    min-height: 2rem;
    padding: 0.125rem 0.25rem 0.125rem 2.125rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    text-align: left;
    color: var(--theme-text, hsl(0, 0%, 10%));
    cursor: pointer;
  }

  .jeepney-modal__stop:hover {
    background: color-mix(in srgb, var(--route-color, #7b1113) 10%, white);
  }

  .jeepney-modal__stops li::before {
    content: "";
    position: absolute;
    left: calc(0.75rem - 1.5px);
    top: 0;
    bottom: 0;
    width: 3px;
    background: color-mix(in srgb, var(--route-color, #7b1113) 55%, white);
  }

  .jeepney-modal__stops li:first-child::before {
    top: 50%;
  }

  .jeepney-modal__stops li:last-child::before {
    bottom: 50%;
  }

  .jeepney-modal__terminal .jeepney-modal__stop {
    font-weight: 700;
  }

  .jeepney-modal__stop-index {
    position: absolute;
    left: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
    border-radius: 999px;
    background: var(--route-color, hsl(5, 40%, 34%));
    border: 2px solid white;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--route-color, #7b1113) 45%, white);
    color: white;
    font-size: 0.6875rem;
    font-weight: 700;
  }

  .jeepney-modal__actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem 0 0.375rem;
    border-top: 1px solid var(--theme-border, hsl(0, 0%, 92%));
  }

  .jeepney-modal__actions :global(.map-chrome-action-chip),
  .jeepney-modal__actions :global(.editor-toggle--toolbar) {
    box-sizing: border-box;
    min-height: 2.25rem;
    border-radius: 999px;
  }

  /* View on map is the primary action: it takes the far end of the row. */
  .jeepney-modal__view {
    margin-left: auto;
  }

  .jeepney-modal__view {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.25rem;
    padding: 0.4rem 1rem;
    border: 1px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    border-radius: 0.625rem;
    background: var(--theme-accent-fill, hsl(5, 53%, 32%));
    color: white;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  .jeepney-modal__view:hover {
    background: var(--theme-accent-fill, hsl(5, 53%, 38%));
  }

  .jeepney-modal__empty {
    padding: 1.5rem;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
    text-align: center;
  }
</style>
