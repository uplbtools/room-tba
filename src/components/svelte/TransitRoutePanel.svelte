<script lang="ts">
  import Info from "@lucide/svelte/icons/info";
  import { JEEPNEY_ROUTES } from "@constants/jeepney-routes";
  import { jeepneyStore } from "@lib/store.svelte";

  type Props = {
    /** Compact row for the search chrome sub-panel. */
    compact?: boolean;
  };

  let { compact = false }: Props = $props();

  function selectRoute(id: string) {
    jeepneyStore.selectRoute(id);
  }
</script>

<div
  class="transit-route-panel"
  class:transit-route-panel--compact={compact}
  role="listbox"
  aria-label="Jeepney routes"
>
  {#each JEEPNEY_ROUTES as route (route.id)}
    {@const isActive = jeepneyStore.selectedRouteId === route.id}
    <div class="transit-route-row">
      <button
        type="button"
        class="transit-route-option"
        class:transit-route-option--active={isActive}
        role="option"
        aria-selected={isActive}
        aria-label={`${route.name}: ${route.description}`}
        onclick={() => selectRoute(route.id)}
      >
        <span
          class="transit-route-option__color"
          style:background-color={route.color}
          aria-hidden="true"
        ></span>
        <span class="transit-route-option__copy">
          <span class="transit-route-option__name">{route.name}</span>
          {#if !compact}
            <span class="transit-route-option__description"
              >{route.description}</span
            >
          {/if}
        </span>
      </button>
      {#if !compact}
        <button
          type="button"
          class="transit-route-details"
          aria-label={`${route.name} route details`}
          title="Route details, fare, and stops"
          onclick={() => jeepneyStore.openRouteModal(route.id)}
        >
          <Info size={16} aria-hidden="true" />
        </button>
      {/if}
    </div>
  {/each}
  {#if jeepneyStore.selectedRouteId !== null}
    <button
      type="button"
      class="transit-route-clear"
      onclick={() => jeepneyStore.clearRoute()}
    >
      Clear active route
    </button>
  {/if}
</div>

<style>
  .transit-route-panel {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  }

  .transit-route-panel--compact {
    flex-flow: row wrap;
    align-items: center;
    gap: 0.375rem;
  }

  .transit-route-row {
    display: flex;
    align-items: stretch;
    gap: 0.25rem;
    min-width: 0;
    width: 100%;
    /* all:unset on the option button makes pointer-events inherit; force auto so
       the row stays clickable inside pointer-events:none map chrome. */
    pointer-events: auto;
  }

  .transit-route-panel--compact .transit-route-row {
    width: auto;
  }

  .transit-route-details {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    border-radius: 0.625rem;
    border: 1px solid transparent;
    background-color: hsl(0, 0%, 98%);
    color: hsl(5, 53%, 32%);
    cursor: pointer;
  }

  .transit-route-details:hover,
  .transit-route-details:focus-visible {
    border-color: hsl(5, 40%, 72%);
    background-color: hsl(5, 53%, 96%);
  }

  .transit-route-option {
    box-sizing: border-box;
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    max-width: 100%;
    padding: 0.4375rem 0.625rem;
    border-radius: 999px;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    cursor: pointer;
    text-align: left;
    font: inherit;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease;
  }

  .transit-route-panel:not(.transit-route-panel--compact)
    .transit-route-option {
    flex: 1 1 auto;
    min-width: 0;
    border-radius: 0.625rem;
    background-color: hsl(0, 0%, 98%);
    border-color: transparent;
  }

  .transit-route-option:hover {
    border-color: hsl(5, 40%, 72%);
    background-color: hsl(5, 53%, 98%);
  }

  .transit-route-option--active {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 96%);
    color: hsl(5, 53%, 22%);
  }

  .transit-route-option__color {
    flex: 0 0 auto;
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 50%;
    box-shadow: 0 0 0 1px hsla(0, 0%, 100%, 0.85);
  }

  .transit-route-option__copy {
    display: flex;
    min-width: 0;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.125rem;
    line-height: 1.2;
  }

  .transit-route-option__name {
    font-size: 0.6875rem;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .transit-route-option__description {
    font-size: 0.75rem;
    color: hsl(0, 0%, 45%);
  }

  .transit-route-clear {
    margin-top: 0.125rem;
    padding: 0.4375rem 0.625rem;
    border-radius: 999px;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    background-color: transparent;
    cursor: pointer;
    font: inherit;
    font-size: 0.6875rem;
    font-weight: 700;
    color: hsl(5, 53%, 32%);
  }

  .transit-route-panel--compact .transit-route-clear {
    margin-top: 0;
    flex: 0 0 auto;
  }

  .transit-route-clear:hover {
    background-color: hsl(5, 53%, 98%);
  }
</style>
