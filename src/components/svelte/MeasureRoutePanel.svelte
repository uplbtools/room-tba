<script lang="ts">
  import Bike from "@lucide/svelte/icons/bike";
  import Car from "@lucide/svelte/icons/car";
  import Footprints from "@lucide/svelte/icons/footprints";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Undo2 from "@lucide/svelte/icons/undo-2";
  import X from "@lucide/svelte/icons/x";
  import { measureRouteStore, type MeasureLeg } from "@lib/store.svelte";
  import { formatDistance, formatDuration } from "@lib/campus-route";

  const modes = [
    { id: "walk", label: "Walk", icon: Footprints },
    { id: "cycle", label: "Cycle", icon: Bike },
    { id: "drive", label: "Car / e-bike", icon: Car },
  ] as const;

  function totals(legs: MeasureLeg[]) {
    // A mode has a total only when every leg is routable under its filters.
    if (legs.length === 0 || legs.some((leg) => leg === null)) return null;
    const routed = legs as { seconds: number; meters: number }[];
    return {
      seconds: routed.reduce((sum, leg) => sum + leg.seconds, 0),
      meters: routed.reduce((sum, leg) => sum + leg.meters, 0),
    };
  }

  const activeLegs = $derived(measureRouteStore.summaries[measureRouteStore.mode]);
  const activeTotal = $derived(totals(activeLegs));
  const enoughWaypoints = $derived(measureRouteStore.waypoints.length >= 2);
</script>

<section class="measure-panel" aria-label="Measure route">
  <div class="measure-panel__header">
    <span class="measure-panel__title">Measure route</span>
    <div class="measure-panel__actions">
      <button
        type="button"
        class="measure-panel__icon-btn"
        aria-label="Undo last waypoint"
        disabled={measureRouteStore.waypoints.length === 0}
        onclick={() => measureRouteStore.undo()}
      >
        <Undo2 size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        class="measure-panel__icon-btn"
        aria-label="Clear waypoints"
        disabled={measureRouteStore.waypoints.length === 0}
        onclick={() => measureRouteStore.clear()}
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        class="measure-panel__icon-btn"
        aria-label="Close measure route"
        onclick={() => measureRouteStore.disable()}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  </div>

  {#if !enoughWaypoints}
    <p class="measure-panel__hint">
      {measureRouteStore.waypoints.length === 0
        ? "Tap the map to drop waypoints along your route."
        : "Tap again to add the next stop; tap a numbered pin to remove it."}
    </p>
  {:else}
    <div class="measure-panel__modes" role="group" aria-label="Travel mode">
      {#each modes as { id, label, icon: Icon } (id)}
        {@const total = totals(measureRouteStore.summaries[id])}
        <button
          type="button"
          class="measure-panel__pill"
          class:measure-panel__pill--selected={measureRouteStore.mode === id}
          aria-pressed={measureRouteStore.mode === id}
          aria-label={label}
          onclick={() => measureRouteStore.setMode(id)}
        >
          <Icon size={16} aria-hidden="true" />
          <span class="measure-panel__pill-time">
            {total ? formatDuration(total.seconds) : "no route"}
          </span>
        </button>
      {/each}
    </div>

    <p class="measure-panel__total">
      {#if activeTotal}
        {formatDistance(activeTotal.meters)} over
        {measureRouteStore.waypoints.length} stops
      {:else}
        No {measureRouteStore.mode === "drive" ? "drivable" : "ridable"} path
        between some stops.
      {/if}
    </p>

    {#if activeLegs.length > 1}
      <details class="measure-panel__legs">
        <summary>Per-leg breakdown</summary>
        <ol>
          {#each activeLegs as leg, i (i)}
            <li>
              <span class="measure-panel__leg-name">{i + 1} → {i + 2}</span>
              <span>
                {leg
                  ? `${formatDistance(leg.meters)} · ${formatDuration(leg.seconds)}`
                  : "no route"}
              </span>
            </li>
          {/each}
        </ol>
      </details>
    {/if}
  {/if}
  {#if measureRouteStore.loadFailed}
    <p class="measure-panel__hint">
      Could not load the path network. Check your connection and tap again.
    </p>
  {/if}
  <p class="measure-panel__attribution">paths © OpenStreetMap contributors</p>
</section>

<style>
  .measure-panel {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    width: min(20rem, calc(100vw - 1rem));
    align-self: flex-start;
    box-sizing: border-box;
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-radius: var(--map-chrome-radius, 1rem);
    background-color: var(--map-chrome-surface, hsl(5 20% 97%));
    backdrop-filter: blur(10px);
    padding: 0.5rem 0.625rem;
    box-shadow: var(
      --map-chrome-panel-shadow,
      0 0 0 1px hsla(15, 8%, 20%, 0.16),
      0 2px 8px hsla(0, 0%, 0%, 0.14),
      0 8px 20px hsla(0, 0%, 0%, 0.18)
    );
    pointer-events: auto;
  }

  .measure-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .measure-panel__title {
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .measure-panel__actions {
    display: flex;
    gap: 0.25rem;
  }

  .measure-panel__icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    border-radius: 50%;
    background: none;
    color: inherit;
    cursor: pointer;
  }

  .measure-panel__icon-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .measure-panel__icon-btn:not(:disabled):hover {
    background-color: hsl(5, 20%, 90%);
  }

  .measure-panel__icon-btn:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .measure-panel__hint {
    margin: 0;
    font-size: 0.6875rem;
    line-height: 1.35;
    color: hsl(0, 0%, 35%);
  }

  .measure-panel__modes {
    display: flex;
    gap: 0.375rem;
  }

  .measure-panel__pill {
    display: flex;
    flex: 1 1 0;
    min-width: 0;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-radius: 999px;
    background: none;
    padding: 0.25rem 0.375rem;
    font-size: 0.6875rem;
    color: inherit;
    cursor: pointer;
    white-space: nowrap;
  }

  .measure-panel__pill--selected {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 32%);
    color: white;
  }

  .measure-panel__pill:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .measure-panel__pill-time {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .measure-panel__total {
    margin: 0;
    font-size: 0.75rem;
  }

  .measure-panel__legs {
    font-size: 0.6875rem;
  }

  .measure-panel__legs summary {
    cursor: pointer;
    color: hsl(5, 53%, 32%);
  }

  .measure-panel__legs ol {
    margin: 0.25rem 0 0;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .measure-panel__legs li {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .measure-panel__leg-name {
    color: hsl(0, 0%, 35%);
  }

  .measure-panel__attribution {
    margin: 0;
    font-size: 0.625rem;
    color: hsl(0, 0%, 45%);
  }
</style>
