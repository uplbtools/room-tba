<script lang="ts">
  import ArrowDownUp from "@lucide/svelte/icons/arrow-down-up";
  import Footprints from "@lucide/svelte/icons/footprints";
  import X from "@lucide/svelte/icons/x";
  import { WALK_KPH } from "@constants/travel-modes";
  import { formatDistance, formatDuration } from "@lib/campus-route";
  import { getAppData } from "@lib/context";
  import { buildBuildingSuggestions } from "@lib/search-suggestions";
  import { buildingRouteStore } from "@lib/store.svelte";
  import type { BuildingData } from "@lib/types";

  const data = getAppData();
  const appData = $derived(data());
  const buildings = $derived(appData.loaded ? appData.buildings : []);

  let originQuery = $state(buildingRouteStore.origin?.buildingName ?? "");
  let destinationQuery = $state(
    buildingRouteStore.destination?.buildingName ?? "",
  );
  let originOpen = $state(false);
  let destinationOpen = $state(false);
  let originActive = $state(0);
  let destinationActive = $state(0);
  let originInput = $state<HTMLInputElement | null>(null);
  let destinationInput = $state<HTMLInputElement | null>(null);

  const originSuggestions = $derived(
    buildBuildingSuggestions(originQuery, buildings),
  );
  const destinationSuggestions = $derived(
    buildBuildingSuggestions(destinationQuery, buildings),
  );
  const route = $derived(buildingRouteStore.route);
  const status = $derived(buildingRouteStore.result?.status ?? null);

  function endpoint(building: BuildingData) {
    return {
      id: building.id,
      buildingName: building.buildingName,
      lat: building.lat,
      lon: building.lon,
    };
  }

  function chooseOrigin(building: BuildingData) {
    originQuery = building.buildingName;
    originOpen = false;
    originActive = 0;
    // Selection itself is synchronous; do not make keyboard focus wait for a
    // lazy graph import or route calculation before handing off to "To".
    void buildingRouteStore.setOrigin(endpoint(building));
    destinationInput?.focus();
  }

  function chooseDestination(building: BuildingData) {
    destinationQuery = building.buildingName;
    destinationOpen = false;
    destinationActive = 0;
    void buildingRouteStore.setDestination(endpoint(building));
  }

  function clearOrigin() {
    originQuery = "";
    originOpen = false;
    originActive = 0;
    buildingRouteStore.clearOrigin();
    originInput?.focus();
  }

  function clearDestination() {
    destinationQuery = "";
    destinationOpen = false;
    destinationActive = 0;
    buildingRouteStore.clearDestination();
    destinationInput?.focus();
  }

  async function swap() {
    const query = originQuery;
    originQuery = destinationQuery;
    destinationQuery = query;
    originOpen = false;
    destinationOpen = false;
    originActive = 0;
    destinationActive = 0;
    await buildingRouteStore.swap();
  }

  function closeOriginSuggestions() {
    setTimeout(() => {
      originOpen = false;
    }, 0);
  }

  function closeDestinationSuggestions() {
    setTimeout(() => {
      destinationOpen = false;
    }, 0);
  }

  function revealActiveOption(id: string) {
    const reveal = () => {
      const option = document.getElementById(id);
      if (option && typeof option.scrollIntoView === "function") {
        option.scrollIntoView({ block: "nearest" });
      }
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(reveal);
    } else {
      setTimeout(reveal, 0);
    }
  }

  function onOriginKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      if (originSuggestions.length === 0) return;
      event.preventDefault();
      originActive = originOpen
        ? Math.min(originActive + 1, originSuggestions.length - 1)
        : 0;
      originOpen = true;
      revealActiveOption(`building-route-origin-${originActive}`);
    } else if (event.key === "ArrowUp") {
      if (originSuggestions.length === 0) return;
      event.preventDefault();
      originActive = originOpen
        ? Math.max(originActive - 1, 0)
        : originSuggestions.length - 1;
      originOpen = true;
      revealActiveOption(`building-route-origin-${originActive}`);
    } else if (event.key === "Enter" && originOpen) {
      const selected = originSuggestions[originActive];
      if (selected) {
        event.preventDefault();
        chooseOrigin(selected);
      }
    } else if (event.key === "Escape") {
      originOpen = false;
    }
  }

  function onDestinationKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      if (destinationSuggestions.length === 0) return;
      event.preventDefault();
      destinationActive = destinationOpen
        ? Math.min(destinationActive + 1, destinationSuggestions.length - 1)
        : 0;
      destinationOpen = true;
      revealActiveOption(`building-route-destination-${destinationActive}`);
    } else if (event.key === "ArrowUp") {
      if (destinationSuggestions.length === 0) return;
      event.preventDefault();
      destinationActive = destinationOpen
        ? Math.max(destinationActive - 1, 0)
        : destinationSuggestions.length - 1;
      destinationOpen = true;
      revealActiveOption(`building-route-destination-${destinationActive}`);
    } else if (event.key === "Enter" && destinationOpen) {
      const selected = destinationSuggestions[destinationActive];
      if (selected) {
        event.preventDefault();
        chooseDestination(selected);
      }
    } else if (event.key === "Escape") {
      destinationOpen = false;
    }
  }

  function statusMessage(): string | null {
    if (buildingRouteStore.phase === "planning") {
      return "Finding walking route…";
    }
    if (buildingRouteStore.phase === "error") {
      return (
        "Could not load the campus path map. " +
        "Try again when it is available."
      );
    }
    if (status === "same-building") {
      return "Same building — no outdoor walking route needed.";
    }
    if (status === "origin-invalid") {
      return "The starting building has no valid map pin.";
    }
    if (status === "destination-invalid") {
      return "The destination building has no valid map pin.";
    }
    if (status === "origin-off-network") {
      return (
        "The starting building is outside the mapped campus walking network."
      );
    }
    if (status === "destination-off-network") {
      return "The destination is outside the mapped campus walking network.";
    }
    if (status === "no-route") {
      return "No mapped campus walking path connects these buildings.";
    }
    return null;
  }
</script>

<section
  class="building-router"
  aria-label="Walk between buildings"
  aria-busy={buildingRouteStore.phase === "planning"}
>
  <div class="building-router__heading">
    <span class="building-router__heading-icon" aria-hidden="true">
      <Footprints size={18} />
    </span>
    <div>
      <h3>Walk between buildings</h3>
      <p>
        Pick two buildings to see the mapped walking path and estimated time.
      </p>
    </div>
  </div>

  <div class="building-router__fields">
    <div class="building-router__field">
      <label for="building-route-origin">From</label>
      <div class="building-router__input-wrap">
        <input
          id="building-route-origin"
          type="text"
          role="combobox"
          aria-label="From building"
          bind:this={originInput}
          autocomplete="off"
          aria-autocomplete="list"
          aria-expanded={originOpen && originSuggestions.length > 0}
          aria-controls="building-route-origin-list"
          aria-activedescendant={originOpen && originSuggestions[originActive]
            ? `building-route-origin-${originActive}`
            : undefined}
          placeholder="Search a building"
          bind:value={originQuery}
          oninput={() => {
            originOpen = true;
            originActive = 0;
            if (
              buildingRouteStore.origin &&
              originQuery !== buildingRouteStore.origin.buildingName
            ) {
              buildingRouteStore.clearOrigin();
            }
          }}
          onfocus={() => (originOpen = originQuery.trim().length > 0)}
          onblur={closeOriginSuggestions}
          onkeydown={onOriginKeydown}
        />
        {#if originQuery}
          <button
            type="button"
            aria-label="Clear starting building"
            onclick={clearOrigin}
          >
            <X size={16} aria-hidden="true" />
          </button>
        {/if}
      </div>

      {#if originOpen && originSuggestions.length > 0}
        <div
          id="building-route-origin-list"
          role="listbox"
          aria-label="Starting building suggestions"
          class="building-router__list"
        >
          {#each originSuggestions as building, index (building.id)}
            <button
              id={`building-route-origin-${index}`}
              type="button"
              role="option"
              tabindex="-1"
              aria-selected={index === originActive}
              class:active={index === originActive}
              onmousedown={(event) => event.preventDefault()}
              onclick={() => chooseOrigin(building)}
            >
              {building.buildingName}
            </button>
          {/each}
        </div>
      {:else if originOpen && originQuery.trim()}
        <p class="building-router__empty" role="status">
          No matching buildings.
        </p>
      {/if}
    </div>

    <button
      type="button"
      class="building-router__swap"
      aria-label="Swap starting and destination buildings"
      disabled={!buildingRouteStore.origin && !buildingRouteStore.destination}
      onclick={() => void swap()}
    >
      <ArrowDownUp size={17} aria-hidden="true" />
      <span>Swap</span>
    </button>

    <div class="building-router__field">
      <label for="building-route-destination">To</label>
      <div class="building-router__input-wrap">
        <input
          id="building-route-destination"
          type="text"
          role="combobox"
          aria-label="To building"
          bind:this={destinationInput}
          autocomplete="off"
          aria-autocomplete="list"
          aria-expanded={destinationOpen && destinationSuggestions.length > 0}
          aria-controls="building-route-destination-list"
          aria-activedescendant={destinationOpen &&
          destinationSuggestions[destinationActive]
            ? `building-route-destination-${destinationActive}`
            : undefined}
          placeholder="Search a building"
          bind:value={destinationQuery}
          oninput={() => {
            destinationOpen = true;
            destinationActive = 0;
            if (
              buildingRouteStore.destination &&
              destinationQuery !== buildingRouteStore.destination.buildingName
            ) {
              buildingRouteStore.clearDestination();
            }
          }}
          onfocus={() =>
            (destinationOpen = destinationQuery.trim().length > 0)}
          onblur={closeDestinationSuggestions}
          onkeydown={onDestinationKeydown}
        />
        {#if destinationQuery}
          <button
            type="button"
            aria-label="Clear destination building"
            onclick={clearDestination}
          >
            <X size={16} aria-hidden="true" />
          </button>
        {/if}
      </div>

      {#if destinationOpen && destinationSuggestions.length > 0}
        <div
          id="building-route-destination-list"
          role="listbox"
          aria-label="Destination building suggestions"
          class="building-router__list"
        >
          {#each destinationSuggestions as building, index (building.id)}
            <button
              id={`building-route-destination-${index}`}
              type="button"
              role="option"
              tabindex="-1"
              aria-selected={index === destinationActive}
              class:active={index === destinationActive}
              onmousedown={(event) => event.preventDefault()}
              onclick={() => chooseDestination(building)}
            >
              {building.buildingName}
            </button>
          {/each}
        </div>
      {:else if destinationOpen && destinationQuery.trim()}
        <p class="building-router__empty" role="status">
          No matching buildings.
        </p>
      {/if}
    </div>
  </div>

  {#if route}
    <div class="building-router__result" role="status" aria-live="polite">
      <span class="building-router__result-kicker">Estimated walk</span>
      <strong>About {formatDuration(route.totalSeconds)} walk</strong>
      <span>{formatDistance(route.totalMeters)}</span>
      <p>
        Uses mapped campus paths plus short approximate connectors from each
        building pin. Walking speed: {WALK_KPH} km/h.
      </p>
    </div>
  {:else if statusMessage()}
    <p class="building-router__status" role="status" aria-live="polite">
      {statusMessage()}
    </p>
  {/if}
</section>

<style>
  .building-router {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
  }

  .building-router__heading {
    display: flex;
    gap: 0.625rem;
    align-items: flex-start;
  }

  .building-router__heading-icon {
    padding-top: 0.125rem;
    color: var(--color-brand, #8d1437);
  }

  h3 {
    margin: 0;
    font-size: 0.9375rem;
  }

  .building-router__heading p,
  .building-router__result p {
    margin: 0.125rem 0 0;
    color: #71717a;
    font-size: 0.75rem;
    line-height: 1.35;
  }

  .building-router__fields {
    display: grid;
    gap: 0.5rem;
  }

  .building-router__field {
    min-width: 0;
  }

  label {
    display: block;
    margin-bottom: 0.25rem;
    color: #52525b;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .building-router__input-wrap {
    display: flex;
    align-items: center;
    border: 1px solid #d4d4d8;
    border-radius: 0.625rem;
    background: #fff;
  }

  .building-router__input-wrap:focus-within {
    border-color: var(--color-brand, #8d1437);
    box-shadow: 0 0 0 2px rgb(141 20 55 / 0.12);
  }

  input {
    width: 100%;
    min-width: 0;
    min-height: 2.75rem;
    border: 0;
    outline: 0;
    padding: 0.625rem 0.75rem;
    background: transparent;
    color: #18181b;
    font: inherit;
  }

  .building-router__input-wrap > button {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    flex: 0 0 2.75rem;
    border: 0;
    background: transparent;
    color: #71717a;
    cursor: pointer;
  }

  .building-router__list {
    max-height: 13rem;
    overflow-y: auto;
    margin: 0.25rem 0 0;
    padding: 0.25rem;
    list-style: none;
    border: 1px solid #e4e4e7;
    border-radius: 0.625rem;
    background: #fff;
    box-shadow: var(--shadow-results, 0 2px 8px rgb(36 37 46 / 0.2));
  }

  .building-router__list button {
    width: 100%;
    min-height: 2.75rem;
    border: 0;
    border-radius: 0.45rem;
    padding: 0.5rem 0.625rem;
    background: transparent;
    color: #27272a;
    text-align: left;
    cursor: pointer;
  }

  .building-router__list button:hover,
  .building-router__list button.active {
    background: #f4f4f5;
  }

  .building-router__empty {
    margin: 0.375rem 0 0;
    color: #71717a;
    font-size: 0.75rem;
  }

  .building-router__swap {
    display: inline-flex;
    align-items: center;
    justify-self: start;
    gap: 0.375rem;
    min-height: 2.75rem;
    border: 1px solid #e4e4e7;
    border-radius: 999px;
    padding: 0.4rem 0.75rem;
    background: #fff;
    color: #3f3f46;
    font-weight: 600;
    cursor: pointer;
  }

  .building-router__swap:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .building-router__result {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: baseline;
    gap: 0.125rem 0.625rem;
    min-width: 0;
    border: 1px solid rgb(141 20 55 / 0.2);
    border-radius: 0.75rem;
    padding: 0.75rem;
    background: rgb(141 20 55 / 0.04);
  }

  .building-router__result-kicker {
    grid-column: 1 / -1;
    color: #71717a;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .building-router__result strong {
    min-width: 0;
    color: #18181b;
    font-size: 1.125rem;
    line-height: 1.25;
  }

  .building-router__result > span:not(.building-router__result-kicker) {
    color: #52525b;
    font-size: 0.875rem;
    white-space: nowrap;
  }

  .building-router__result p {
    grid-column: 1 / -1;
  }

  .building-router__status {
    margin: 0;
    border-radius: 0.625rem;
    padding: 0.625rem 0.75rem;
    background: #fff7ed;
    color: #92400e;
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  button:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--color-brand, #8d1437);
    outline-offset: 2px;
  }

  @media (max-width: 20rem) {
    .building-router__result {
      grid-template-columns: 1fr;
    }

    .building-router__result > span:not(.building-router__result-kicker) {
      white-space: normal;
    }
  }
</style>
