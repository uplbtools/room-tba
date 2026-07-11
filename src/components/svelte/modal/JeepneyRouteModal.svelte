<script lang="ts">
  import MapPinned from "@lucide/svelte/icons/map-pinned";
  import { jeepneyStore, modalStore } from "@lib/store.svelte";
  import {
    JEEPNEY_ROUTES,
    JEEPNEY_FARE_NOTE,
  } from "@constants/jeepney-routes";
  import { getJeepneyRouteShareUrl } from "@lib/share-links";
  import EntityShareCopyLink from "../controls/EntityShareCopyLink.svelte";

  const route = $derived(
    JEEPNEY_ROUTES.find((entry) => entry.id === jeepneyStore.modalRouteId) ??
      null,
  );

  function viewOnMap() {
    if (!route) return;
    jeepneyStore.openRouteOnMap(route.id);
    modalStore.closeModal();
  }
</script>

{#if route}
  <div class="jeepney-modal">
    <header class="jeepney-modal__header">
      <span
        class="jeepney-modal__swatch"
        style:background-color={route.color}
        aria-hidden="true"
      ></span>
      <h2 class="jeepney-modal__title">{route.name} jeepney route</h2>
    </header>

    <div class="jeepney-modal__scroll">
      <p class="jeepney-modal__desc">{route.description}</p>

      <dl class="jeepney-modal__fare">
        <div>
          <dt>Regular fare</dt>
          <dd>₱{route.fare.regular}</dd>
        </div>
        <div>
          <dt>Student / PWD / senior</dt>
          <dd>₱{route.fare.discounted}</dd>
        </div>
      </dl>
      <p class="jeepney-modal__fare-note">{JEEPNEY_FARE_NOTE}</p>

      <h3 class="jeepney-modal__stops-title">
        Stops <span>({route.stops.length})</span>
      </h3>
      <ol class="jeepney-modal__stops">
        {#each route.stops as stop, i (`${route.id}-${i}`)}
          <li>
            <span class="jeepney-modal__stop-index">{i + 1}</span>
            <span class="jeepney-modal__stop-name">{stop.name}</span>
          </li>
        {/each}
      </ol>
    </div>

    <div class="jeepney-modal__actions">
      <EntityShareCopyLink
        url={getJeepneyRouteShareUrl(route.id)}
        entityLabel={`${route.name} route`}
      />
      <button type="button" class="jeepney-modal__view" onclick={viewOnMap}>
        <MapPinned size={16} aria-hidden="true" />
        View on map
      </button>
    </div>
  </div>
{:else}
  <p class="jeepney-modal__empty">This jeepney route is no longer available.</p>
{/if}

<style>
  .jeepney-modal {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem 0.5rem 0.25rem;
    flex: 1 1 auto;
    min-height: 0;
  }

  .jeepney-modal__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-right: 2.25rem;
  }

  .jeepney-modal__swatch {
    width: 0.875rem;
    height: 0.875rem;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .jeepney-modal__title {
    margin: 0;
    font-size: 1.0625rem;
    font-weight: 700;
    color: hsl(0, 0%, 15%);
  }

  .jeepney-modal__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-right: 0.375rem;
  }

  .jeepney-modal__desc {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: hsl(0, 0%, 25%);
  }

  .jeepney-modal__fare {
    display: flex;
    gap: 0.75rem;
    margin: 0;
  }

  .jeepney-modal__fare div {
    flex: 1 1 0;
    border: 1px solid hsl(0, 0%, 88%);
    border-radius: 0.625rem;
    padding: 0.5rem 0.75rem;
  }

  .jeepney-modal__fare dt {
    font-size: 0.75rem;
    color: hsl(0, 0%, 40%);
  }

  .jeepney-modal__fare dd {
    margin: 0.125rem 0 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: hsl(5, 53%, 32%);
  }

  .jeepney-modal__fare-note {
    margin: 0;
    font-size: 0.75rem;
    color: hsl(0, 0%, 45%);
  }

  .jeepney-modal__stops-title {
    margin: 0.25rem 0 0;
    font-size: 0.8125rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: hsl(0, 0%, 40%);
  }

  .jeepney-modal__stops-title span {
    color: hsl(0, 0%, 60%);
  }

  .jeepney-modal__stops {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .jeepney-modal__stops li {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 0.875rem;
    color: hsl(0, 0%, 20%);
  }

  .jeepney-modal__stop-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
    border-radius: 999px;
    background: hsl(5, 30%, 94%);
    color: hsl(5, 40%, 34%);
    font-size: 0.75rem;
    font-weight: 700;
  }

  .jeepney-modal__actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 0.25rem 0 0.375rem;
    border-top: 1px solid hsl(0, 0%, 92%);
  }

  .jeepney-modal__view {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.25rem;
    padding: 0.4rem 1rem;
    border: 1px solid hsl(5, 53%, 32%);
    border-radius: 0.625rem;
    background: hsl(5, 53%, 32%);
    color: white;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  .jeepney-modal__view:hover {
    background: hsl(5, 53%, 38%);
  }

  .jeepney-modal__empty {
    padding: 1.5rem;
    color: hsl(0, 0%, 45%);
    text-align: center;
  }
</style>
