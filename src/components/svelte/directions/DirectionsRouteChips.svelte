<script lang="ts">
  /**
   * Origin → stops → destination under the search bar while Get Directions
   * is open. Reorder/remove waypoints here; the bottom sheet only shows options.
   */
  import Crosshair from "@lucide/svelte/icons/crosshair";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import X from "@lucide/svelte/icons/x";
  import LocateFixed from "@lucide/svelte/icons/locate-fixed";
  import {
    directionsStore,
    locationStore,
    type DirectionsPick,
  } from "@lib/store.svelte";

  const waypoints = $derived(directionsStore.waypoints);
  const picking = $derived(directionsStore.picking);

  function togglePick(which: DirectionsPick) {
    if (directionsStore.picking === which) directionsStore.cancelPick();
    else directionsStore.beginPick(which);
  }

  function useMyLocation() {
    const coords = locationStore.coords;
    if (coords) {
      void directionsStore.setOrigin(
        { lat: coords[1], lng: coords[0], label: "Your location" },
        false,
      );
      return;
    }
    // No fix yet: DirectionsPanel replans once GPS lands.
    locationStore.requestLocation();
    void directionsStore.setOrigin(null, false);
  }
</script>

{#if directionsStore.active && !directionsStore.navigating}
  <div class="directions-route-chips">
    <div
      class="directions-route-chips__list"
      role="list"
      aria-label="Directions stop sequence"
    >
      <div role="listitem">
        <button
          type="button"
          class="directions-route-chips__end"
          class:directions-route-chips__end--picking={picking === "origin"}
          aria-pressed={picking === "origin"}
          aria-label={`Change starting point, now ${directionsStore.origin?.label ?? "Your location"}`}
          onmousedown={(event) => event.preventDefault()}
          onclick={() => togglePick("origin")}
        >
          <Crosshair size={14} aria-hidden="true" />
          <span
            >{picking === "origin"
              ? "Choose a starting point"
              : (directionsStore.origin?.label ?? "Your location")}</span
          >
        </button>
      </div>

      {#each waypoints as stop, index (stop.label + index)}
        <div class="directions-route-chips__stop" role="listitem">
          <span class="directions-route-chips__badge" aria-hidden="true"
            >{index + 1}</span
          >
          <span class="directions-route-chips__label">{stop.label}</span>
          <div class="directions-route-chips__actions">
            <button
              type="button"
              class="directions-route-chips__icon"
              aria-label={`Move ${stop.label} up`}
              disabled={index === 0}
              onmousedown={(event) => event.preventDefault()}
              onclick={() => void directionsStore.moveWaypoint(index, index - 1)}
            >
              <ChevronUp size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              class="directions-route-chips__icon"
              aria-label={`Move ${stop.label} down`}
              disabled={index === waypoints.length - 1}
              onmousedown={(event) => event.preventDefault()}
              onclick={() => void directionsStore.moveWaypoint(index, index + 1)}
            >
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              class="directions-route-chips__icon"
              aria-label={`Remove stop ${stop.label}`}
              onmousedown={(event) => event.preventDefault()}
              onclick={() => void directionsStore.removeWaypoint(index)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      {/each}

      <div role="listitem">
        <button
          type="button"
          class="directions-route-chips__end directions-route-chips__end--to"
          class:directions-route-chips__end--picking={picking ===
            "destination"}
          aria-pressed={picking === "destination"}
          aria-label={`Change destination, now ${directionsStore.destination?.label ?? "not set"}`}
          onmousedown={(event) => event.preventDefault()}
          onclick={() => togglePick("destination")}
        >
          <MapPin size={14} aria-hidden="true" />
          <span
            >{picking === "destination" || !directionsStore.destination
              ? "Choose a destination"
              : directionsStore.destination.label}</span
          >
        </button>
      </div>

      {#if picking}
        <p class="directions-route-chips__hint">
          Search above or tap the map.
          {#if picking === "origin" && directionsStore.originFixed}
            <button
              type="button"
              class="directions-route-chips__mine"
              onmousedown={(event) => event.preventDefault()}
              onclick={useMyLocation}
            >
              <LocateFixed size={13} aria-hidden="true" />
              Use my location
            </button>
          {/if}
        </p>
      {/if}
    </div>

    <button
      type="button"
      class="directions-route-chips__close"
      aria-label="Close directions"
      onmousedown={(event) => event.preventDefault()}
      onclick={() => directionsStore.close()}
    >
      <X size={16} aria-hidden="true" />
    </button>
  </div>
{/if}

<style>
  .directions-route-chips {
    display: flex;
    align-items: flex-start;
    gap: 0.375rem;
    max-width: 100%;
    min-width: 0;
    margin-top: 0.375rem;
    padding: 0.5rem 0.55rem;
    border-radius: 0.875rem;
    background: var(--theme-surface, #fff);
    border: 1px solid var(--theme-border, hsl(5 10% 86%));
    box-shadow: var(--shadow-search, 0 1px 3.5px rgb(58 58 71 / 0.12));
    pointer-events: auto;
  }

  .directions-route-chips__list {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
  }

  .directions-route-chips__end {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    margin: 0;
    padding: 0.1rem 0.25rem;
    min-width: 0;
    border: 1px solid transparent;
    border-radius: 0.4rem;
    background: none;
    color: var(--theme-text-2, #52525b);
    font: inherit;
    font-size: 0.8125rem;
    line-height: 1.3;
    text-align: left;
    cursor: pointer;
  }

  .directions-route-chips__end:hover,
  .directions-route-chips__end:focus-visible {
    background: var(--theme-surface-2, #f4f4f5);
  }

  .directions-route-chips__end--picking {
    border-color: var(--color-brand, var(--theme-accent-text, #8d1437));
    color: var(--color-brand, var(--theme-accent-text, #8d1437));
    font-weight: 600;
  }

  .directions-route-chips__hint {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    margin: 0;
    color: var(--theme-text-2, #52525b);
    font-size: 0.75rem;
  }

  .directions-route-chips__mine {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.15rem 0.45rem;
    border: none;
    border-radius: 999px;
    background: var(--theme-surface-2, #f4f4f5);
    color: var(--theme-text, #18181b);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .directions-route-chips__mine:hover,
  .directions-route-chips__mine:focus-visible {
    background: var(--theme-surface-3, #e4e4e7);
  }

  .directions-route-chips__end span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .directions-route-chips__end--to {
    color: var(--theme-text, #18181b);
    font-weight: 600;
  }

  .directions-route-chips__stop {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-width: 0;
  }

  .directions-route-chips__badge {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 1.15rem;
    height: 1.15rem;
    border-radius: 999px;
    background: var(--color-brand, var(--theme-accent-fill, #8d1437));
    color: #fff;
    font-size: 0.625rem;
    font-weight: 700;
  }

  .directions-route-chips__label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--theme-text, #18181b);
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .directions-route-chips__actions {
    display: flex;
    flex: 0 0 auto;
    gap: 0.1rem;
  }

  .directions-route-chips__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border: none;
    border-radius: 0.35rem;
    background: var(--theme-surface-2, #f4f4f5);
    color: var(--theme-text, #3f3f46);
    cursor: pointer;
  }

  .directions-route-chips__icon:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .directions-route-chips__icon:not(:disabled):hover,
  .directions-route-chips__icon:not(:disabled):focus-visible {
    background: var(--theme-surface-3, #e4e4e7);
  }

  .directions-route-chips__close {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: var(--theme-surface-2, #f4f4f5);
    color: var(--theme-text, #3f3f46);
    cursor: pointer;
  }

  .directions-route-chips__close:hover,
  .directions-route-chips__close:focus-visible {
    background: var(--theme-surface-3, #e4e4e7);
  }

  @media (max-width: 48rem) {
    .directions-route-chips {
      margin-top: 0.5rem;
      padding: 0.55rem 0.6rem;
    }
  }
</style>
