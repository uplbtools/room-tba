<script lang="ts">
  /**
   * Navigation sheet (#966): remaining time, distance and arrival clock with
   * an Exit control at peek; expanded, the full step list with the current
   * step marked. The current step itself is the top banner
   * (NavigationBanner), and Re-centre floats over the map there, so nothing
   * here can push the ETA off screen.
   */
  import X from "@lucide/svelte/icons/x";
  import Footprints from "@lucide/svelte/icons/footprints";
  import Bus from "@lucide/svelte/icons/bus";
  import { directionsStore, locationStore } from "@lib/store.svelte";
  import { formatDistance, formatDuration } from "@lib/campus-route";
  import type { RideLeg } from "@lib/travel-graph/journey";
  import { navigationState as nav } from "./navigation-state.svelte";

  const journey = $derived(nav.journey);

  const arrival = $derived(
    new Date(Date.now() + nav.remainingSeconds * 1000).toLocaleTimeString(
      undefined,
      { hour: "numeric", minute: "2-digit" },
    ),
  );

  const isRide = $derived(
    journey?.legs.some((leg): leg is RideLeg => leg.kind === "ride") ?? false,
  );
</script>

{#if directionsStore.navigating && journey}
  <div class="nav">
    <div class="nav__bar">
      <div class="nav__summary" role="status" aria-live="polite">
        {#if nav.arrived}
          <p class="nav__time">You have arrived</p>
          <p class="nav__meta">{directionsStore.destination?.label ?? ""}</p>
        {:else}
          <p class="nav__time">
            {formatDuration(nav.remainingSeconds)}
            <span class="nav__mode" aria-hidden="true">
              {#if isRide}
                <Bus size={18} />
              {:else}
                <Footprints size={18} />
              {/if}
            </span>
          </p>
          <p class="nav__meta">
            {formatDistance(nav.remainingMeters)} · {arrival}
          </p>
        {/if}
      </div>

      <button
        type="button"
        class="nav__exit"
        aria-label="Exit navigation"
        onclick={() => directionsStore.stopNavigation()}
      >
        <X size={18} aria-hidden="true" />
        Exit
      </button>
    </div>

    {#if nav.offRoute && !nav.arrived}
      <p class="nav__off" role="status">
        You look about {formatDistance(nav.offRouteMeters)} off the route.
      </p>
    {/if}

    {#if !locationStore.coords}
      <p class="nav__off" role="status">
        Waiting for your location — showing the planned time until then.
      </p>
    {/if}

    <ol class="nav__steps" aria-label="Steps">
      {#each nav.steps as step, index (index)}
        <li
          class="nav__step"
          class:nav__step--current={index === nav.stepIndex && !nav.arrived}
          class:nav__step--done={index < nav.stepIndex || nav.arrived}
          aria-current={index === nav.stepIndex && !nav.arrived
            ? "step"
            : undefined}
        >
          <span
            class="nav__step-icon"
            style:color={step.color ?? "var(--color-brand, #8d1437)"}
            aria-hidden="true"
          >
            {#if step.kind === "walk"}
              <Footprints size={18} />
            {:else}
              <Bus size={18} />
            {/if}
          </span>
          <span class="nav__step-body">
            <span class="nav__step-text">{step.text}</span>
            <span class="nav__step-detail">{step.detail}</span>
          </span>
        </li>
      {/each}
    </ol>
  </div>
{/if}

<style>
  .nav {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .nav__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .nav__exit {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    /* 44px target, matching the browse chips (#942). */
    min-width: 2.75rem;
    height: 2.75rem;
    padding: 0 1rem 0 0.75rem;
    border: none;
    border-radius: 999px;
    background: #b91c1c;
    color: #fff;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
  }

  .nav__exit:hover,
  .nav__exit:focus-visible {
    background: #991b1b;
  }

  .nav__summary {
    flex: 1 1 auto;
    min-width: 0;
  }

  .nav__time {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin: 0;
    color: #15803d;
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
  }

  .nav__steps {
    display: flex;
    flex-direction: column;
    margin: 0.25rem 0 0;
    padding: 0.5rem 0 0;
    border-top: 1px solid #e4e4e7;
    list-style: none;
  }

  .nav__step {
    display: flex;
    gap: 0.75rem;
    padding: 0.625rem 0.5rem;
    border-radius: 0.625rem;
  }

  .nav__step--current {
    background: #f0fdf4;
  }

  .nav__step--done {
    opacity: 0.55;
  }

  .nav__step-icon {
    display: flex;
    flex: 0 0 auto;
    padding-top: 0.125rem;
  }

  .nav__step-body {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .nav__step-text {
    color: #18181b;
    font-size: 0.9375rem;
    font-weight: 600;
  }

  .nav__step-detail {
    color: #52525b;
    font-size: 0.8125rem;
  }
</style>
