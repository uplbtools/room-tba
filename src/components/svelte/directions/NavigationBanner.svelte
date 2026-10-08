<script lang="ts">
  /**
   * Navigation's top instruction banner (#966): the current step in large
   * type ("Walk to UP University Health Service stop", "Board the Forestry
   * jeep", "Get off at …") and what comes next. Takes the search bar's place
   * while navigating. Re-centre and Overview float over the map under it.
   */
  import Footprints from "@lucide/svelte/icons/footprints";
  import Bus from "@lucide/svelte/icons/bus";
  import Flag from "@lucide/svelte/icons/flag";
  import LocateFixed from "@lucide/svelte/icons/locate-fixed";
  import Route from "@lucide/svelte/icons/route";
  import { directionsStore } from "@lib/store.svelte";
  import { navigationState as nav } from "./navigation-state.svelte";
  import { fitDirectionsRoute } from "./fit-route";

  const step = $derived(nav.steps[nav.stepIndex] ?? null);
  const next = $derived(nav.steps[nav.stepIndex + 1] ?? null);

  function overview() {
    // Leave follow mode so the camera stays on the whole route.
    directionsStore.releaseCamera();
    fitDirectionsRoute(700);
  }
</script>

{#if directionsStore.navigating && nav.journey}
  <div class="nav-banner">
    <div class="nav-banner__card" role="status" aria-live="polite">
      <span class="nav-banner__icon" aria-hidden="true">
        {#if nav.arrived || !step}
          <Flag size={28} />
        {:else if step.kind === "walk"}
          <Footprints size={28} />
        {:else}
          <Bus size={28} />
        {/if}
      </span>
      <div class="nav-banner__body">
        {#if nav.arrived || !step}
          <p class="nav-banner__text">
            Arrived at {directionsStore.destination?.label ?? "your destination"}
          </p>
        {:else}
          <p class="nav-banner__text">{step.text}</p>
          <p class="nav-banner__detail">{step.detail}</p>
        {/if}
      </div>
    </div>
    {#if next && !nav.arrived}
      <p class="nav-banner__then">Then: {next.text}</p>
    {/if}

    <div class="nav-banner__tools">
      {#if !directionsStore.cameraFollowing}
        <button
          type="button"
          class="nav-banner__tool"
          onclick={() => directionsStore.recenter()}
        >
          <LocateFixed size={16} aria-hidden="true" />
          Re-centre
        </button>
      {/if}
      <button
        type="button"
        class="nav-banner__tool"
        aria-label="Route overview"
        onclick={overview}
      >
        <Route size={16} aria-hidden="true" />
        Overview
      </button>
    </div>
  </div>
{/if}

<style>
  .nav-banner {
    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    pointer-events: auto;
  }

  /* Desktop: same width as the left panel, like the From/To fields. */
  @media (min-width: 48.0625rem) {
    .nav-banner {
      width: var(--map-search-chrome-width, min(31rem, calc(100vw - 15rem)));
    }
  }

  .nav-banner__card {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 0.875rem 1rem;
    border-radius: 1rem 1rem 0 0;
    background: #166534;
    color: #fff;
    box-shadow: var(--shadow-results, 0 2px 6px rgb(36 37 46 / 0.2));
  }

  .nav-banner__card:last-child {
    border-radius: 1rem;
  }

  .nav-banner__icon {
    display: flex;
    flex: 0 0 auto;
  }

  .nav-banner__body {
    min-width: 0;
  }

  .nav-banner__text {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.25;
  }

  .nav-banner__detail {
    margin: 0.125rem 0 0;
    font-size: 0.875rem;
    opacity: 0.9;
  }

  .nav-banner__then {
    margin: 0;
    padding: 0.375rem 1rem;
    border-radius: 0 0 1rem 1rem;
    background: #14532d;
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
  }

  /* Floats over the map under the banner; never part of the sheet's flow. */
  .nav-banner__tools {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    display: flex;
    gap: 0.5rem;
  }

  /* Desktop: the drawer sits under the banner, so float beside it instead. */
  @media (min-width: 48.0625rem) {
    .nav-banner__tools {
      top: 0;
      right: auto;
      left: calc(100% + 0.75rem);
    }
  }

  .nav-banner__tool {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.75rem;
    padding: 0.375rem 0.875rem;
    border: none;
    border-radius: 999px;
    background: var(--theme-surface, #fff);
    color: var(--color-brand, var(--theme-accent-text, #8d1437));
    font-size: 0.875rem;
    font-weight: 600;
    white-space: nowrap;
    box-shadow: var(--shadow-results, 0 2px 6px rgb(36 37 46 / 0.2));
    cursor: pointer;
  }
</style>
