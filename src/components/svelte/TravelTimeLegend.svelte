<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import { travelTimeStore } from "@lib/store.svelte";
  import {
    ISOCHRONE_CAP_MINUTES,
    VIRIDIS_STOPS,
  } from "@constants/travel-modes";

  const gradient = `linear-gradient(90deg, ${VIRIDIS_STOPS.join(", ")})`;
  const ticks = ["0", "10", "20", `${ISOCHRONE_CAP_MINUTES}+ min`];
</script>

<section class="travel-time-legend" aria-label="Walking time legend">
  <div class="travel-time-legend__header">
    <span class="travel-time-legend__title">Walking time</span>
    <button
      type="button"
      class="travel-time-legend__close"
      aria-label="Turn off travel time"
      onclick={() => travelTimeStore.disable()}
    >
      <X size={14} aria-hidden="true" />
    </button>
  </div>
  {#if !travelTimeStore.origin}
    <p class="travel-time-legend__hint">
      Tap the map to color every path by walking minutes from that point.
    </p>
  {:else if travelTimeStore.status === "loading"}
    <p class="travel-time-legend__hint">Computing walking times…</p>
  {:else if travelTimeStore.status === "error"}
    <p class="travel-time-legend__hint">
      Could not load the path network. Check your connection and tap again.
    </p>
  {:else}
    <div
      class="travel-time-legend__ramp"
      style={`background: ${gradient}`}
      aria-hidden="true"
    ></div>
    <div class="travel-time-legend__ticks" aria-hidden="true">
      {#each ticks as tick (tick)}
        <span>{tick}</span>
      {/each}
    </div>
  {/if}
  <p class="travel-time-legend__attribution">
    paths © OpenStreetMap contributors
  </p>
</section>

<style>
  .travel-time-legend {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: min(16rem, calc(100vw - 1rem));
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

  .travel-time-legend__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .travel-time-legend__title {
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .travel-time-legend__close {
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

  .travel-time-legend__close:hover {
    background-color: hsl(5, 20%, 90%);
  }

  .travel-time-legend__close:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .travel-time-legend__hint {
    margin: 0;
    font-size: 0.6875rem;
    line-height: 1.35;
    color: hsl(0, 0%, 35%);
  }

  .travel-time-legend__ramp {
    height: 0.5rem;
    border-radius: 0.25rem;
  }

  .travel-time-legend__ticks {
    display: flex;
    justify-content: space-between;
    font-size: 0.625rem;
    color: hsl(0, 0%, 35%);
  }

  .travel-time-legend__attribution {
    margin: 0;
    font-size: 0.625rem;
    color: hsl(0, 0%, 45%);
  }
</style>
