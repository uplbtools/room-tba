<script lang="ts">
  import Building2 from "@lucide/svelte/icons/building-2";
  import DoorOpen from "@lucide/svelte/icons/door-open";
  import House from "@lucide/svelte/icons/house";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Star from "@lucide/svelte/icons/star";
  import X from "@lucide/svelte/icons/x";
  import type { Component } from "svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import { modalStore } from "@lib/store.svelte";
  import {
    openSavedPlace,
    recentPlaces,
    savedPlaces,
    savedPlaceKey,
    type SavedPlace,
    type SavedPlaceCategory,
  } from "@lib/saved-places.svelte";

  const ICONS: Record<SavedPlaceCategory, Component> = {
    building: Building2,
    room: DoorOpen,
    dorm: House,
    place: MapPin,
  };

  function open(place: SavedPlace) {
    modalStore.closeModal();
    openSavedPlace(place);
  }
</script>

{#snippet row(place: SavedPlace, onremove?: () => void)}
  {@const Icon = ICONS[place.category]}
  <li class="saved-places__row">
    <button
      type="button"
      class="saved-places__open"
      onclick={() => open(place)}
    >
      <span class="saved-places__icon" aria-hidden="true"><Icon size={18} /></span>
      <span class="saved-places__text">
        <span class="saved-places__label">{place.label}</span>
        {#if place.subtitle}
          <span class="saved-places__subtitle">{place.subtitle}</span>
        {/if}
      </span>
    </button>
    {#if onremove}
      <button
        type="button"
        class="saved-places__remove"
        aria-label={`Remove ${place.label} from Saved`}
        title="Remove from Saved"
        onclick={onremove}
      >
        <X size={16} aria-hidden="true" />
      </button>
    {/if}
  </li>
{/snippet}

<section class="saved-places">
  <ModalHeader
    id="saved-places-modal-title"
    title="Saved"
    description="Places you starred and opened recently, on this device."
  />

  <div class="saved-places__scroll map-chrome-scroll">
    <section aria-labelledby="saved-places-starred">
      <h3 id="saved-places-starred">Saved places</h3>
      {#if savedPlaces.items.length === 0}
        <p class="saved-places__empty">
          Tap <Star size={13} aria-hidden="true" /> Save on any building, room, dorm
          or place to keep it here.
        </p>
      {:else}
        <ul>
          {#each savedPlaces.items as place (savedPlaceKey(place))}
            {@render row(place, () =>
              savedPlaces.remove(place.category, place.value),
            )}
          {/each}
        </ul>
      {/if}
    </section>

    <section aria-labelledby="saved-places-recent">
      <div class="saved-places__section-head">
        <h3 id="saved-places-recent">Recently viewed</h3>
        {#if recentPlaces.items.length > 0}
          <button
            type="button"
            class="saved-places__clear"
            onclick={() => recentPlaces.clear()}
          >
            Clear
          </button>
        {/if}
      </div>
      {#if recentPlaces.items.length === 0}
        <p class="saved-places__empty">Places you open show up here.</p>
      {:else}
        <ul>
          {#each recentPlaces.items as place (savedPlaceKey(place))}
            {@render row(place)}
          {/each}
        </ul>
      {/if}
    </section>
  </div>
</section>

<style>
  .saved-places {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 0.25rem;
  }

  .saved-places__scroll {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
    padding: 0 0.5rem 0.25rem;
  }

  .saved-places__scroll > section {
    display: grid;
    gap: 0.375rem;
  }

  h3 {
    margin: 0;
    color: hsl(5 53% 28%);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .saved-places__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  ul {
    display: grid;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .saved-places__row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .saved-places__open {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: 0.625rem;
    min-width: 0;
    min-height: 2.75rem;
    padding: 0.375rem 0.5rem;
    border: none;
    border-radius: 0.625rem;
    background: transparent;
    color: hsl(0 0% 15%);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .saved-places__icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: hsl(5 53% 95%);
    color: hsl(5 53% 32%);
  }

  .saved-places__text {
    display: grid;
    min-width: 0;
  }

  .saved-places__label,
  .saved-places__subtitle {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .saved-places__label {
    font-size: 0.875rem;
    font-weight: 600;
  }

  .saved-places__subtitle {
    color: hsl(0 0% 40%);
    font-size: 0.75rem;
  }

  .saved-places__remove,
  .saved-places__clear {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    min-width: 2.75rem;
    min-height: 2.75rem;
    border: none;
    border-radius: 0.625rem;
    background: transparent;
    color: hsl(0 0% 35%);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 700;
    cursor: pointer;
  }

  .saved-places__clear {
    min-height: 2rem;
    color: hsl(5 53% 32%);
  }

  .saved-places__empty {
    margin: 0;
    padding: 0.25rem 0.5rem;
    color: hsl(0 0% 40%);
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  .saved-places__empty :global(svg) {
    vertical-align: -2px;
  }

  @media (hover: hover) {
    .saved-places__open:hover,
    .saved-places__remove:hover,
    .saved-places__clear:hover {
      background: hsl(0 78% 97%);
    }
  }

  .saved-places__open:focus-visible,
  .saved-places__remove:focus-visible,
  .saved-places__clear:focus-visible {
    outline: 2px solid hsl(5 53% 32%);
    outline-offset: -2px;
  }
</style>
