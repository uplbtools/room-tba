<script lang="ts">
  /**
   * Google-Maps-shaped directions: travel-mode tabs with their times, a
   * pinned Start row (the sheet's peek ends just under it), and route cards
   * ranked fastest first, inside the mobile sheet / desktop drawer (#966).
   *
   * The map stays live behind this panel — see BottomSheet, which no longer
   * lays a dismiss scrim over the map strip.
   */
  import { untrack } from "svelte";
  import Footprints from "@lucide/svelte/icons/footprints";
  import Bus from "@lucide/svelte/icons/bus";
  import Navigation from "@lucide/svelte/icons/navigation";
  import {
    directionsStore,
    locationStore,
    mapStore,
    YOUR_LOCATION_LABEL,
    type DirectionsMode,
  } from "@lib/store.svelte";
  import { formatDistance, formatDuration } from "@lib/campus-route";
  import {
    describeJourney,
    PLAN_STATUS_NOTES,
    type Journey,
    type RideLeg,
  } from "@lib/travel-graph/journey";
  import { journeyOptionLabel } from "@lib/travel-graph/plan-multi-leg";
  import NavigationBar from "./NavigationBar.svelte";
  import CommuteItinerary from "./CommuteItinerary.svelte";
  import { fitDirectionsRoute } from "./fit-route";
  import { JEEPNEY_FARE_NOTE } from "@constants/jeepney-routes";
  import {
    JEEPNEY_KPH,
    JEEPNEY_WAIT_SECONDS,
    WALK_KPH,
  } from "@constants/travel-modes";

  const journeys = $derived(directionsStore.journeys);
  const selected = $derived(directionsStore.selected);

  const MODE_LABELS: Record<DirectionsMode, string> = {
    walk: "Walk",
    transit: "Jeep",
  };

  /** Clock time the rider actually arrives — the "how long till" answer. */
  function arrivalLabel(seconds: number): string {
    const at = new Date(Date.now() + seconds * 1000);
    return at.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function rideLeg(journey: Journey): RideLeg | undefined {
    return journey.legs.find((leg): leg is RideLeg => leg.kind === "ride");
  }

  function rideLegs(journey: Journey): RideLeg[] {
    return journey.legs.filter((leg): leg is RideLeg => leg.kind === "ride");
  }

  /** Fit once per plan shape so open/replan/add-stop reframes both ends. */
  let lastFittedKey: string | null = null;
  let fitTimer: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    const journey = selected;
    const phase = directionsStore.phase;
    const navigating = directionsStore.navigating;
    const stopCount = directionsStore.waypoints.length;
    const dest = directionsStore.destination;
    if (phase !== "ready" || !journey || navigating) return;
    const fitKey = `${journey.id}:${journey.meters}:${stopCount}:${dest?.lat}:${dest?.lng}`;
    if (lastFittedKey === fitKey) return;
    lastFittedKey = fitKey;
    // Sheet peek animates in; measure after it settles or padding is stale.
    if (fitTimer) clearTimeout(fitTimer);
    fitTimer = setTimeout(() => {
      fitTimer = null;
      untrack(() => fitDirectionsRoute());
    }, 180);
  });

  const statusNote = $derived(
    directionsStore.status ? PLAN_STATUS_NOTES[directionsStore.status] : null,
  );

  /**
   * The chip fires before the GPS watch has a fix, so the first plan often has
   * no origin. Replan when coordinates land, and again when they move far
   * enough to matter — a drifting fix must not re-run Dijkstra every tick.
   */
  const REPLAN_THRESHOLD_METERS = 25;
  /**
   * Plain `let`, not `$state`: this is bookkeeping the effect both reads and
   * writes, and as reactive state it would retrigger the very effect that set
   * it.
   */
  let plannedFrom: [number, number] | null = null;

  $effect(() => {
    // Only the GPS fix is a tracked dependency. Everything below is read and
    // written inside untrack, because replan() writes back to
    // directionsStore.origin/destination/phase — tracking those here would
    // make the effect retrigger itself (effect_update_depth_exceeded).
    const coords = locationStore.coords;
    if (!coords) return;

    untrack(() => {
      // A start point the rider chose wins over the blue dot.
      if (directionsStore.originFixed) return;
      const here = {
        lat: coords[1],
        lng: coords[0],
        label: YOUR_LOCATION_LABEL,
      };
      const destination = directionsStore.destination;
      if (!destination) {
        // Opened from the home screen: the From field shows the fix.
        directionsStore.origin = here;
        return;
      }

      if (plannedFrom) {
        const movedMeters = Math.hypot(
          (coords[0] - plannedFrom[0]) *
            111_320 *
            Math.cos((coords[1] * Math.PI) / 180),
          (coords[1] - plannedFrom[1]) * 111_320,
        );
        if (movedMeters < REPLAN_THRESHOLD_METERS) return;
      }

      plannedFrom = [coords[0], coords[1]];
      void directionsStore.replan(here, destination);
    });
  });

  function flyToStop(coordinate: [number, number] | undefined) {
    if (!coordinate) return;
    mapStore.mapInstance?.flyTo({ center: coordinate, zoom: 18, duration: 800 });
  }
</script>

<section class="directions" aria-label="Directions">
  {#if directionsStore.navigating}
    <NavigationBar />
  {:else if !directionsStore.destination}
    <p class="directions__note" role="status">
      Search for a place or tap the map to choose where you are going.
    </p>
  {:else if directionsStore.phase === "planning" && directionsStore.origin}
    <p class="directions__note" role="status">Finding the best ways there…</p>
  {:else if directionsStore.phase === "planning"}
    <!-- No start point yet. Location can be denied, unavailable, or a prompt
         the rider never answers, so never only wait: always offer to pick a
         start point instead (search or tap the map, as for any stop). -->
    {#if locationStore.failure}
      <p class="directions__note directions__note--warn" role="status">
        {locationStore.failure} Choose where you are starting from instead.
      </p>
    {:else}
      <p class="directions__note" role="status">
        Waiting for your location… or choose where you are starting from.
      </p>
    {/if}
    <!-- "Use my location" (the retry) sits under the From field. -->
    <button
      type="button"
      class="directions__ghost"
      onclick={() => directionsStore.beginPick("origin")}
    >
      Choose starting point
    </button>
  {:else if directionsStore.phase === "error"}
    <p class="directions__note directions__note--warn" role="status">
      Could not load the campus path map. Check your connection and try again.
    </p>
  {:else if journeys.length === 0}
    <p class="directions__note directions__note--warn" role="status">
      {statusNote ?? "No route found."}
    </p>
  {:else}
    <div class="directions__modes" role="tablist" aria-label="Travel mode">
      {#each directionsStore.modes as { mode, seconds } (mode)}
        <button
          type="button"
          role="tab"
          class="directions__mode"
          aria-selected={directionsStore.mode === mode}
          aria-label={`${MODE_LABELS[mode]}, ${formatDuration(seconds)}`}
          onclick={() => directionsStore.selectMode(mode)}
        >
          {#if mode === "transit"}
            <Bus size={16} aria-hidden="true" />
          {:else}
            <Footprints size={16} aria-hidden="true" />
          {/if}
          <span aria-hidden="true">{formatDuration(seconds)}</span>
        </button>
      {/each}
    </div>

    {#if selected}
      <!-- The sheet's peek ends under this row, so Start is always in reach. -->
      <div class="directions__start-row">
        <div class="directions__summary">
          <p class="directions__summary-time">
            {formatDuration(selected.seconds)}
            <span class="directions__summary-meters"
              >({formatDistance(selected.meters)})</span
            >
          </p>
          <p class="directions__summary-meta">
            {#if selected.id === directionsStore.fastestId}
              <span class="directions__fastest">Fastest</span> ·
            {/if}
            arrives {arrivalLabel(selected.seconds)}
          </p>
        </div>
        <button
          type="button"
          class="directions__show"
          onclick={() => directionsStore.startNavigation()}
        >
          <Navigation size={16} aria-hidden="true" />
          Start
        </button>
      </div>
    {/if}

    <ul class="directions__options" aria-label="Routes">
      {#each journeys as journey (journey.id)}
        {@const ride = rideLeg(journey)}
        {@const isSelected = selected?.id === journey.id}
        {@const modeLabel = journeyOptionLabel(journey)}
        <li>
          <button
            type="button"
            class="option"
            class:option--selected={isSelected}
            aria-pressed={isSelected}
            onclick={() => directionsStore.select(journey.id)}
          >
            <span
              class="option__icon"
              style:color={ride ? ride.color : "var(--color-brand, #8d1437)"}
              aria-hidden="true"
            >
              {#if ride}
                <Bus size={20} />
              {:else}
                <Footprints size={20} />
              {/if}
            </span>

            <span class="option__body">
              <span class="option__mode">
                {modeLabel}
                {#if journey.id === directionsStore.fastestId}
                  · <span class="directions__fastest">Fastest</span>
                {/if}
              </span>
              <span class="option__time"
                >{formatDuration(journey.seconds)}</span
              >
              <span class="option__meta">
                {formatDistance(journey.meters)} · arrives {arrivalLabel(
                  journey.seconds,
                )}
              </span>
              <span class="option__desc">{describeJourney(journey)}</span>
              {#if ride && !isSelected}
                {#each rideLegs(journey) as leg, n (n)}
                  <span class="option__desc">
                    {n > 0 ? "Then board" : "Board"} at {leg.boardStopName} · alight
                    at {leg.alightStopName}
                  </span>
                {/each}
              {/if}
              {#if journey.fare}
                <span class="option__fare">
                  ₱{journey.fare.regular} · ₱{journey.fare.discounted} student/senior/PWD{rideLegs(
                    journey,
                  ).length > 1
                    ? " (both rides)"
                    : ""}
                </span>
              {/if}
            </span>
          </button>
          {#if ride && isSelected}
            <!-- Outside the option button (no nested buttons): tap a stop
                 name to see where to board or get off. -->
            <CommuteItinerary {journey} onstop={flyToStop} />
          {/if}
        </li>
      {/each}
    </ul>

    <div class="directions__actions">
      <button
        type="button"
        class="directions__ghost"
        onclick={() => fitDirectionsRoute()}
      >
        Show on map
      </button>
    </div>

    <p class="directions__caveat">
      Estimated from campus path data at {WALK_KPH} km/h walking. Jeep times
      assume a {Math.round(JEEPNEY_WAIT_SECONDS / 60)} min wait and a {JEEPNEY_KPH}
      km/h average — there is no live tracking.
      {#if selected && rideLeg(selected)}
        {selected.fare
          ? JEEPNEY_FARE_NOTE
          : "Town jeep fares depend on distance; ask the driver."}
      {/if}
    </p>
  {/if}
</section>

<style>
  .directions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .directions__note {
    margin: 0;
    color: var(--theme-text-2, #52525b);
    font-size: 0.875rem;
  }

  .directions__note--warn {
    color: var(--theme-amber-text, #92400e);
  }

  .directions__options {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin: 0;
    padding: 0;
    list-style: none;
    min-width: 0;
    max-width: 100%;
  }

  .directions__options > li {
    min-width: 0;
    max-width: 100%;
  }

  .option {
    display: flex;
    gap: 0.625rem;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    /* 44px minimum target, matching the browse chips (#942). */
    min-height: 2.75rem;
    padding: 0.625rem;
    border: 1px solid transparent;
    border-radius: 0.75rem;
    background: var(--theme-surface, #fafafa);
    text-align: left;
    cursor: pointer;
  }

  .option:hover {
    background: var(--theme-surface-2, #f4f4f5);
  }

  .option--selected {
    border-color: var(--color-brand, var(--theme-accent-text, #8d1437));
    background: var(--theme-surface, #fff);
    box-shadow: var(--shadow-results, 0 2px 6px rgb(36 37 46 / 0.2));
  }

  .option__icon {
    display: flex;
    flex: 0 0 auto;
    align-items: flex-start;
    padding-top: 0.125rem;
  }

  .option__body {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .option__mode {
    color: var(--theme-text-2, #52525b);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .option__time {
    color: var(--theme-text, #18181b);
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .option__meta {
    color: var(--theme-text, #3f3f46);
    font-size: 0.8125rem;
  }

  .option__desc,
  .option__fare {
    color: var(--theme-text-2, #52525b);
    font-size: 0.75rem;
    line-height: 1.35;
  }

  .option__fare {
    color: var(--theme-text, #3f3f46);
    font-weight: 600;
  }

  .directions__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    min-width: 0;
  }

  .directions__ghost {
    flex: 0 1 auto;
    min-width: 0;
    min-height: 2.75rem;
    padding: 0.625rem 1rem;
    border: 1px solid var(--theme-border, #e4e4e7);
    border-radius: 999px;
    background: var(--theme-surface, #fff);
    color: var(--theme-text, #3f3f46);
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
  }

  .directions__ghost:hover,
  .directions__ghost:focus-visible {
    background: var(--theme-surface-2, #f4f4f5);
  }

  .directions__modes {
    display: flex;
    gap: 0.375rem;
    min-width: 0;
  }

  .directions__mode {
    display: inline-flex;
    flex: 0 1 auto;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    min-height: 2.75rem;
    padding: 0.375rem 0.875rem;
    border: 1px solid #e4e4e7;
    border-radius: 999px;
    background: #fff;
    color: #3f3f46;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  .directions__mode[aria-selected="true"] {
    border-color: transparent;
    background: #fbe9ee;
    color: var(--color-brand, #8d1437);
  }

  .directions__start-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    padding: 0.125rem 0 0.25rem;
  }

  .directions__summary {
    flex: 1 1 auto;
    min-width: 0;
  }

  .directions__summary-time {
    margin: 0;
    color: #18181b;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .directions__summary-meters {
    color: #52525b;
    font-size: 0.9375rem;
    font-weight: 500;
  }

  .directions__summary-meta {
    margin: 0;
    color: #52525b;
    font-size: 0.8125rem;
  }

  .directions__fastest {
    color: #15803d;
    font-weight: 700;
    letter-spacing: normal;
    text-transform: none;
  }

  .directions__show {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    min-width: 0;
    min-height: 2.75rem;
    padding: 0.625rem 1.5rem;
    border: none;
    border-radius: 999px;
    background: var(--color-brand, var(--theme-accent-fill, #8d1437));
    color: #fff;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
  }

  .directions__show:hover,
  .directions__show:focus-visible {
    filter: brightness(1.08);
  }

  .directions__caveat {
    margin: 0;
    color: var(--theme-text-2, #71717a);
    font-size: 0.6875rem;
    line-height: 1.4;
  }
</style>
