<script lang="ts">
  /**
   * Walk → board → ride → get off → walk, as a small vertical timeline under
   * the selected commute option (Google Maps transit steps, compact).
   */
  import Footprints from "@lucide/svelte/icons/footprints";
  import Bus from "@lucide/svelte/icons/bus";
  import { formatDistance, formatDuration } from "@lib/campus-route";
  import type { Journey } from "@lib/travel-graph/journey";

  type Props = {
    journey: Journey;
    /** Show a stop on the map ([lng, lat]). */
    onstop?: (coordinate: [number, number] | undefined) => void;
  };

  let { journey, onstop }: Props = $props();

  /** Boarding right at the start (or alighting at the end) is no walk. */
  const MIN_WALK_METERS = 15;
</script>

<ol class="itinerary" aria-label="Trip steps">
  {#each journey.legs as leg, n (n)}
    {#if leg.kind === "walk"}
      {#if leg.meters >= MIN_WALK_METERS}
        <li class="itinerary__step itinerary__step--walk">
          <span class="itinerary__icon" aria-hidden="true"
            ><Footprints size={14} /></span
          >
          <span
            >Walk {formatDuration(leg.seconds)}
            <span class="itinerary__meta">({formatDistance(leg.meters)})</span
            ></span
          >
        </li>
      {/if}
    {:else}
      {@const hops = leg.stopCount - 1}
      {@const between = leg.stopNames.slice(1, -1)}
      <li
        class="itinerary__step itinerary__step--board"
        style:--leg-color={leg.color}
      >
        <span class="itinerary__icon itinerary__icon--ride" aria-hidden="true"
          ><Bus size={14} /></span
        >
        <span
          >Board <strong
            >{leg.routeName}{leg.directionLabel
              ? ` (${leg.directionLabel})`
              : ""}</strong
          >
          at
          <button
            type="button"
            class="itinerary__stop"
            onclick={() => onstop?.(leg.coordinates[0])}
            >{leg.boardStopName}</button
          ></span
        >
      </li>
      <li
        class="itinerary__step itinerary__step--ride"
        style:--leg-color={leg.color}
      >
        {#if between.length > 0}
          <details class="itinerary__ride">
            <summary
              >Ride {hops} stop{hops === 1 ? "" : "s"}
              <span class="itinerary__meta"
                >({formatDuration(leg.seconds - leg.waitSeconds)})</span
              ></summary
            >
            <ol class="itinerary__between">
              {#each between as name, i (i)}
                <li>{name}</li>
              {/each}
            </ol>
          </details>
        {:else}
          <span
            >Ride {hops} stop{hops === 1 ? "" : "s"}
            <span class="itinerary__meta"
              >({formatDuration(leg.seconds - leg.waitSeconds)})</span
            ></span
          >
        {/if}
      </li>
      <li
        class="itinerary__step itinerary__step--alight"
        style:--leg-color={leg.color}
      >
        <span class="itinerary__dot" aria-hidden="true"></span>
        <span
          >Get off at
          <button
            type="button"
            class="itinerary__stop"
            onclick={() => onstop?.(leg.coordinates.at(-1))}
            >{leg.alightStopName}</button
          ></span
        >
      </li>
    {/if}
  {/each}
</ol>

<style>
  .itinerary {
    list-style: none;
    margin: 0.375rem 0 0;
    padding: 0 0.25rem;
    display: flex;
    flex-direction: column;
    font-size: 0.8125rem;
    line-height: 1.35;
    color: var(--theme-text, #3f3f46);
  }

  /* The rail: dotted for walking, solid route colour for the ride. */
  .itinerary__step {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 1.75rem;
    padding-left: 1.75rem;
  }

  .itinerary__step::before {
    content: "";
    position: absolute;
    left: calc(0.625rem - 1px);
    top: 0;
    bottom: 0;
    border-left: 2px dotted var(--theme-border-strong, #a1a1aa);
  }

  .itinerary__step:first-child::before {
    top: 50%;
  }

  .itinerary__step:last-child::before {
    bottom: 50%;
  }

  .itinerary__step--ride::before,
  .itinerary__step--board::before {
    border-left: 3px solid var(--leg-color, var(--theme-accent-text, #8d1437));
    left: calc(0.625rem - 1.5px);
  }

  .itinerary__step--board::before {
    top: 50%;
  }

  .itinerary__step--alight::before {
    border-left: 3px solid var(--leg-color, var(--theme-accent-text, #8d1437));
    left: calc(0.625rem - 1.5px);
    bottom: 50%;
  }

  .itinerary__step--alight:not(:last-child)::after {
    content: "";
    position: absolute;
    left: calc(0.625rem - 1px);
    top: 50%;
    bottom: 0;
    border-left: 2px dotted var(--theme-border-strong, #a1a1aa);
  }

  .itinerary__icon,
  .itinerary__dot {
    position: absolute;
    left: 0;
    z-index: 1;
    display: inline-grid;
    place-items: center;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 999px;
    background: var(--theme-surface, white);
    color: var(--theme-text-2, #52525b);
  }

  .itinerary__icon--ride {
    background: var(--leg-color, var(--theme-accent-fill, #8d1437));
    color: white;
  }

  .itinerary__dot::after {
    content: "";
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    border: 2px solid var(--leg-color, var(--theme-accent-text, #8d1437));
    background: var(--theme-surface, white);
  }

  .itinerary__meta {
    color: var(--theme-text-2, #71717a);
  }

  .itinerary__stop {
    all: unset;
    box-sizing: border-box;
    color: var(--color-brand, var(--theme-accent-text, #8d1437));
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
  }

  .itinerary__stop:focus-visible {
    outline: 2px solid var(--color-brand, var(--theme-accent-text, #8d1437));
    outline-offset: 1px;
  }

  .itinerary__ride summary {
    cursor: pointer;
    padding: 0.25rem 0;
  }

  .itinerary__between {
    margin: 0 0 0.25rem;
    padding: 0;
    list-style: none;
    color: var(--theme-text-2, #52525b);
    font-size: 0.75rem;
  }

  .itinerary__between li {
    padding: 0.125rem 0;
  }
</style>
