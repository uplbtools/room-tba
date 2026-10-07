<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import X from "@lucide/svelte/icons/x";
  import MapPinned from "@lucide/svelte/icons/map-pinned";
  import { jeepneyStore, modalStore, transitStore } from "@lib/store.svelte";
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
  import EntityShareCopyLink from "../controls/EntityShareCopyLink.svelte";
  import TransitStopEditor from "../controls/TransitStopEditor.svelte";

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

  const route = $derived(
    transitStore.getRoute(routeId ?? jeepneyStore.modalRouteId),
  );

  // Campus fares, tips and the transit-map credit are about campus jeeps;
  // buses and town jeeps get their own (or none).
  const kind = $derived(route ? transitRouteKind(route) : "campus");
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

  function viewOnMap() {
    if (!route) return;
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
    <header class="jeepney-modal__header">
      <span
        class="jeepney-modal__swatch"
        style:background-color={route.color}
        aria-hidden="true"
      ></span>
      <h2 class="jeepney-modal__title">{route.name} {transitRouteNoun(route)}</h2>
    </header>

    <div class="jeepney-modal__scroll">
      <p class="jeepney-modal__desc">{route.description}</p>

      {#if ROUTE_BOARDING_NOTES[route.id]}
        <p class="jeepney-modal__direction">{ROUTE_BOARDING_NOTES[route.id]}</p>
      {/if}

      {#if route.directionNote}
        <p class="jeepney-modal__direction">{route.directionNote}</p>
      {/if}

      {#if fare?.kind === "ticketed"}
        <p class="jeepney-modal__ticketing">
          Buy tickets on the
          <a href={fare.ticketing.url} target="_blank" rel="noopener noreferrer"
            >{fare.ticketing.operator} website</a
          >, which also lists the current fare.
        </p>
      {:else if fare}
        {#if fare.kind === "fixed" || fare.kind === "end-to-end"}
          <dl class="jeepney-modal__fare">
            <div>
              <dt>{fare.kind === "end-to-end" ? "Whole route" : "Regular fare"}</dt>
              <dd>₱{fare.fare.regular}</dd>
            </div>
            <div>
              <dt>Student / PWD / senior</dt>
              <dd>₱{fare.fare.discounted}</dd>
            </div>
          </dl>
        {:else if fare.kind === "distance"}
          <dl class="jeepney-modal__fare">
            <div>
              <dt>Minimum fare</dt>
              <dd>₱{fare.minimum.regular}</dd>
            </div>
            <div>
              <dt>Student / PWD / senior</dt>
              <dd>₱{fare.minimum.discounted}</dd>
            </div>
          </dl>
        {/if}
        <p class="jeepney-modal__fare-note">{fare.note}</p>
      {/if}

      {#if geometryNote}
        <p class="jeepney-modal__geometry-note">{geometryNote}</p>
      {/if}

      <h3 class="jeepney-modal__stops-title">
        Stops <span
          >({distinctStopCount(route)}{loop ? ", loop" : ""})</span
        >
      </h3>
      <ol class="jeepney-modal__stops">
        {#each route.stops as stop, i (`${route.id}-${i}`)}
          <li>
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
      <TransitStopEditor routeId={route.id} routeName={route.name} />

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
    </div>

    <div class="jeepney-modal__actions">
      <EntityShareCopyLink
        url={getJeepneyRouteShareUrl(route.id)}
        entityLabel={`${route.name} route`}
      />
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

  .jeepney-modal__desc {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }

  .jeepney-modal__direction {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }

  .jeepney-modal__fare {
    display: flex;
    gap: 0.75rem;
    margin: 0;
  }

  .jeepney-modal__fare div {
    flex: 1 1 0;
    border: 1px solid var(--theme-border, hsl(0, 0%, 88%));
    border-radius: 0.625rem;
    padding: 0.5rem 0.75rem;
  }

  .jeepney-modal__fare dt {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--theme-text, hsl(0, 0%, 28%));
  }

  .jeepney-modal__fare dd {
    margin: 0.125rem 0 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }

  .jeepney-modal__ticketing {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.45;
  }

  .jeepney-modal__ticketing a {
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    font-weight: 600;
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
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 0.25rem 0 0.375rem;
    border-top: 1px solid var(--theme-border, hsl(0, 0%, 92%));
  }

  .jeepney-modal__actions :global(.map-chrome-action-chip) {
    min-height: 2.25rem;
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
