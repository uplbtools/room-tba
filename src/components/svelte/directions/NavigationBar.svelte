<script lang="ts">
  /**
   * Follow-mode chrome (#966): the GMaps navigation bar — remaining time,
   * distance and arrival clock, an exit button, and a recentre control that
   * appears once a manual pan has released the camera.
   *
   * Renders above the map rather than over it, so the route and the puck stay
   * visible; the map itself keeps every gesture.
   */
  import X from "@lucide/svelte/icons/x";
  import LocateFixed from "@lucide/svelte/icons/locate-fixed";
  import Footprints from "@lucide/svelte/icons/footprints";
  import Bus from "@lucide/svelte/icons/bus";
  import { directionsStore, locationStore } from "@lib/store.svelte";
  import { formatDistance, formatDuration } from "@lib/campus-route";
  import { routeProgress, type RideLeg } from "@lib/travel-graph/journey";

  const journey = $derived(directionsStore.selected);

  const progress = $derived.by(() => {
    const coords = locationStore.coords;
    if (!journey || !coords) return null;
    return routeProgress(journey, { lat: coords[1], lng: coords[0] });
  });

  /** Falls back to the planned total until the first fix lands. */
  const remainingSeconds = $derived(
    progress?.remainingSeconds ?? journey?.seconds ?? 0,
  );
  const remainingMeters = $derived(progress?.remainingMeters ?? journey?.meters ?? 0);

  const arrival = $derived(
    new Date(Date.now() + remainingSeconds * 1000).toLocaleTimeString(
      undefined,
      { hour: "numeric", minute: "2-digit" },
    ),
  );

  const isRide = $derived(
    journey?.legs.some((leg): leg is RideLeg => leg.kind === "ride") ?? false,
  );

  /** Past this the rider is not on the drawn line any more. */
  const OFF_ROUTE_METERS = 40;
  const offRoute = $derived(
    (progress?.offRouteMeters ?? 0) > OFF_ROUTE_METERS,
  );

  const arrived = $derived(remainingMeters < 15);
</script>

{#if directionsStore.navigating && journey}
  <div class="nav">
    {#if !directionsStore.cameraFollowing}
      <div class="nav__recenter-row">
        <button
          type="button"
          class="nav__recenter"
          onclick={() => directionsStore.recenter()}
        >
          <LocateFixed size={16} aria-hidden="true" />
          Re-centre
        </button>
      </div>
    {/if}

    <div class="nav__bar">
      <button
        type="button"
        class="nav__exit"
        aria-label="Exit navigation"
        onclick={() => directionsStore.stopNavigation()}
      >
        <X size={20} aria-hidden="true" />
      </button>

      <div class="nav__summary" role="status" aria-live="polite">
        {#if arrived}
          <p class="nav__time">You have arrived</p>
          <p class="nav__meta">{directionsStore.destination?.label ?? ""}</p>
        {:else}
          <p class="nav__time">
            {formatDuration(remainingSeconds)}
            <span class="nav__mode" aria-hidden="true">
              {#if isRide}
                <Bus size={18} />
              {:else}
                <Footprints size={18} />
              {/if}
            </span>
          </p>
          <p class="nav__meta">
            {formatDistance(remainingMeters)} · {arrival}
          </p>
        {/if}
      </div>

      <button
        type="button"
        class="nav__options"
        aria-label="Back to route options"
        onclick={() => directionsStore.stopNavigation()}
      >
        <span aria-hidden="true">⇅</span>
      </button>
    </div>

    {#if offRoute && !arrived}
      <p class="nav__off" role="status">
        You look about {formatDistance(progress?.offRouteMeters ?? 0)} off the
        route.
      </p>
    {/if}

    {#if !locationStore.coords}
      <p class="nav__off" role="status">
        Waiting for your location — showing the planned time until then.
      </p>
    {/if}
  </div>
{/if}

<style>
  .nav {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .nav__recenter-row {
    display: flex;
    justify-content: center;
  }

  .nav__recenter {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.25rem;
    padding: 0.375rem 0.875rem;
    border: none;
    border-radius: 999px;
    background: var(--theme-surface, #fff);
    color: var(--color-brand, var(--theme-accent-text, #8d1437));
    font-size: 0.8125rem;
    font-weight: 600;
    box-shadow: var(--shadow-results, 0 2px 6px rgb(36 37 46 / 0.2));
    cursor: pointer;
  }

  .nav__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .nav__exit,
  .nav__options {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    /* 44px target, matching the browse chips (#942). */
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border: 1px solid var(--theme-border, #e4e4e7);
    border-radius: 999px;
    background: var(--theme-surface, #fff);
    color: var(--theme-text, #3f3f46);
    font-size: 1.125rem;
    cursor: pointer;
  }

  .nav__exit:hover,
  .nav__options:hover {
    background: var(--theme-surface-2, #f4f4f5);
  }

  .nav__summary {
    flex: 1 1 auto;
    min-width: 0;
    text-align: center;
  }

  .nav__time {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    margin: 0;
    color: var(--theme-text, #18181b);
    font-size: 1.375rem;
    font-weight: 700;
    line-height: 1.15;
  }

  .nav__mode {
    display: inline-flex;
    color: var(--theme-text, #3f3f46);
  }

  .nav__meta {
    margin: 0;
    color: var(--theme-text-2, #52525b);
    font-size: 0.875rem;
  }

  .nav__off {
    margin: 0;
    color: var(--theme-amber-text, #92400e);
    font-size: 0.75rem;
    text-align: center;
  }
</style>
