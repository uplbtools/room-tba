<script lang="ts">
  /**
   * GMaps-style From / To fields that replace the search bar while Get
   * Directions is open: type in either to search places inline (the search
   * bar's own suggestion list renders under them), swap the ends with ⇅, and
   * reorder or remove stops in between. Tapping the map also fills the field
   * being edited.
   */
  import Crosshair from "@lucide/svelte/icons/crosshair";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import ArrowUpDown from "@lucide/svelte/icons/arrow-up-down";
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import LocateFixed from "@lucide/svelte/icons/locate-fixed";
  import { tick } from "svelte";
  import {
    directionsStore,
    locationStore,
    MAX_DIRECTIONS_WAYPOINTS,
    YOUR_LOCATION_LABEL,
  } from "@lib/store.svelte";

  type Field = "origin" | "destination" | "stop";

  let {
    searching = false,
    onSearchFocus,
    onSearchBlur,
    onSearchInput,
    onDismissSearch,
  }: {
    /** The suggestion list is open for one of these fields. */
    searching?: boolean;
    onSearchFocus?: () => void;
    onSearchBlur?: () => void;
    /** Feed typed text to the shared place search. */
    onSearchInput?: (value: string) => void;
    /** Close the suggestion list without choosing. */
    onDismissSearch?: () => void;
  } = $props();

  const waypoints = $derived(directionsStore.waypoints);

  /** Field being typed in, and what has been typed. */
  let editing = $state<Field | null>(null);
  let draft = $state("");

  let destinationInput = $state<HTMLInputElement | null>(null);
  let stopInput = $state<HTMLInputElement | null>(null);

  const originLabel = $derived(directionsStore.origin?.label ?? "");
  const destinationLabel = $derived(directionsStore.destination?.label ?? "");

  /**
   * No start yet and none coming: location was denied or failed, or never
   * asked. The field reads empty and offers to try location again.
   */
  const originMissing = $derived(
    !directionsStore.origin &&
      (locationStore.failure !== null || !locationStore.isTracking),
  );


  const showUseMyLocation = $derived(
    originMissing ||
      (directionsStore.picking === "origin" && directionsStore.originFixed),
  );

  const canAddStop = $derived(
    directionsStore.destination !== null &&
      waypoints.length < MAX_DIRECTIONS_WAYPOINTS,
  );

  function fieldValue(field: Field, label: string): string {
    return editing === field ? draft : label;
  }

  function startEditing(field: Field, event: FocusEvent) {
    if (field === "stop") directionsStore.beginAddStop();
    else directionsStore.beginPick(field);
    editing = field;
    draft = "";
    onSearchInput?.("");
    onSearchFocus?.();
    // Select so the first key replaces the shown label.
    (event.currentTarget as HTMLInputElement).select();
  }

  function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
    draft = event.currentTarget.value;
    onSearchInput?.(draft);
  }

  function handleBlur() {
    // Keep `picking` armed so a map tap can still fill the field.
    editing = null;
    draft = "";
    onSearchBlur?.();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") dismissSearch();
  }

  function dismissSearch() {
    (document.activeElement as HTMLElement | null)?.blur();
    directionsStore.cancelPick();
    directionsStore.cancelAddStop();
    onDismissSearch?.();
  }

  // A pick from the list or the map lands: leave the field.
  $effect(() => {
    const armed = directionsStore.picking !== null || directionsStore.addingStop;
    if (!armed && editing) {
      (document.activeElement as HTMLElement | null)?.blur();
      editing = null;
      draft = "";
    }
  });

  // Opened with no destination (home Directions button, "Directions from
  // here"): go straight to the destination field, as GMaps does.
  let autofocused = false;
  $effect(() => {
    const input = destinationInput;
    if (
      !autofocused &&
      input &&
      !directionsStore.destination &&
      directionsStore.picking === "destination"
    ) {
      autofocused = true;
      input.focus();
    }
  });

  async function addStop() {
    directionsStore.beginAddStop();
    await tick();
    stopInput?.focus();
  }

  function useMyLocation() {
    const coords = locationStore.coords;
    if (coords) {
      void directionsStore.setOrigin(
        { lat: coords[1], lng: coords[0], label: YOUR_LOCATION_LABEL },
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
  <div class="directions-route-chips" class:is-searching={searching}>
    {#if searching}
      <button
        type="button"
        class="directions-route-chips__icon-btn"
        aria-label="Close search"
        onmousedown={(event) => event.preventDefault()}
        onclick={dismissSearch}
      >
        <ArrowLeft size={20} aria-hidden="true" />
      </button>
    {/if}

    <div
      class="directions-route-chips__list"
      role="list"
      aria-label="Directions stop sequence"
    >
      <div class="directions-route-chips__row" role="listitem">
        <span class="directions-route-chips__glyph" aria-hidden="true">
          <Crosshair size={16} />
        </span>
        <input
          class="directions-route-chips__field"
          class:directions-route-chips__field--picking={directionsStore.picking ===
            "origin"}
          type="text"
          role="searchbox"
          autocomplete="off"
          enterkeyhint="search"
          aria-label="Starting point"
          aria-controls="search-suggestions"
          placeholder={directionsStore.picking === "origin" && editing !== "origin"
            ? "Search or tap the map"
            : "Choose starting point"}
          value={fieldValue("origin", originLabel)}
          onfocus={(event) => startEditing("origin", event)}
          oninput={handleInput}
          onblur={handleBlur}
          onkeydown={handleKeydown}
        />
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

      {#if directionsStore.addingStop}
        <div class="directions-route-chips__row" role="listitem">
          <span class="directions-route-chips__glyph" aria-hidden="true">
            <Plus size={16} />
          </span>
          <input
            bind:this={stopInput}
            class="directions-route-chips__field directions-route-chips__field--picking"
            type="text"
            role="searchbox"
            autocomplete="off"
            enterkeyhint="search"
            aria-label="Add a stop"
            aria-controls="search-suggestions"
            placeholder="Search a stop or tap the map"
            value={fieldValue("stop", "")}
            onfocus={(event) => startEditing("stop", event)}
            oninput={handleInput}
            onblur={handleBlur}
            onkeydown={handleKeydown}
          />
          <button
            type="button"
            class="directions-route-chips__icon"
            aria-label="Cancel adding a stop"
            onmousedown={(event) => event.preventDefault()}
            onclick={() => directionsStore.cancelAddStop()}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      {/if}

      <div class="directions-route-chips__row" role="listitem">
        <span
          class="directions-route-chips__glyph directions-route-chips__glyph--to"
          aria-hidden="true"
        >
          <MapPin size={16} />
        </span>
        <input
          bind:this={destinationInput}
          class="directions-route-chips__field directions-route-chips__field--to"
          class:directions-route-chips__field--picking={directionsStore.picking ===
            "destination"}
          type="text"
          role="searchbox"
          autocomplete="off"
          enterkeyhint="search"
          aria-label="Destination"
          aria-controls="search-suggestions"
          placeholder="Choose destination"
          value={fieldValue("destination", destinationLabel)}
          onfocus={(event) => startEditing("destination", event)}
          oninput={handleInput}
          onblur={handleBlur}
          onkeydown={handleKeydown}
        />
      </div>

      {#if showUseMyLocation || (canAddStop && !directionsStore.addingStop)}
        <div class="directions-route-chips__extras">
          {#if showUseMyLocation}
            <button
              type="button"
              class="directions-route-chips__pill"
              onmousedown={(event) => event.preventDefault()}
              onclick={useMyLocation}
            >
              <LocateFixed size={14} aria-hidden="true" />
              Use my location
            </button>
          {/if}
          {#if canAddStop && !directionsStore.addingStop}
            <button
              type="button"
              class="directions-route-chips__pill"
              onmousedown={(event) => event.preventDefault()}
              onclick={addStop}
            >
              <Plus size={14} aria-hidden="true" />
              Add stop
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <div class="directions-route-chips__side">
      <button
        type="button"
        class="directions-route-chips__icon-btn"
        aria-label="Close directions"
        onmousedown={(event) => event.preventDefault()}
        onclick={() => directionsStore.close()}
      >
        <X size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        class="directions-route-chips__icon-btn"
        aria-label="Swap start and destination"
        disabled={!directionsStore.origin && !directionsStore.destination}
        onmousedown={(event) => event.preventDefault()}
        onclick={() => void directionsStore.swap()}
      >
        <ArrowUpDown size={18} aria-hidden="true" />
      </button>
    </div>
  </div>
{/if}

<style>
  .directions-route-chips {
    display: flex;
    align-items: flex-start;
    gap: 0.25rem;
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding: 0.5rem 0.375rem 0.5rem 0.625rem;
    border-radius: 1rem;
    background: #fff;
    border: 1px solid hsl(5 10% 86%);
    box-shadow: var(--shadow-search, 0 1px 3.5px rgb(58 58 71 / 0.12));
    pointer-events: auto;
  }

  /* Desktop: the fields sit over the left panel, not across the map. */
  @media (min-width: 48.0625rem) {
    .directions-route-chips {
      width: var(--map-search-chrome-width, min(31rem, calc(100vw - 15rem)));
    }
  }

  .directions-route-chips.is-searching {
    padding-left: 0.25rem;
  }

  .directions-route-chips__list {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.375rem;
    min-width: 0;
  }

  .directions-route-chips__row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .directions-route-chips__glyph {
    display: flex;
    flex: 0 0 auto;
    color: #52525b;
  }

  .directions-route-chips__glyph--to {
    color: var(--color-brand, #8d1437);
  }

  .directions-route-chips__field {
    flex: 1 1 auto;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    height: 2.5rem;
    margin: 0;
    padding: 0 0.75rem;
    border: 1px solid #e4e4e7;
    border-radius: 0.625rem;
    background: #f4f4f5;
    color: #18181b;
    font: inherit;
    /* 16px stops iOS zooming the page on focus. */
    font-size: 1rem;
    text-overflow: ellipsis;
  }

  .directions-route-chips__field::placeholder {
    color: #71717a;
  }

  .directions-route-chips__field:focus {
    outline: none;
    border-color: var(--color-brand, #8d1437);
    background: #fff;
  }

  .directions-route-chips__field--picking {
    border-color: var(--color-brand, #8d1437);
  }

  .directions-route-chips__field--to {
    font-weight: 600;
  }

  .directions-route-chips__extras {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    padding-left: 1.5rem;
  }

  .directions-route-chips__pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    min-height: 2rem;
    padding: 0.25rem 0.75rem;
    border: 1px solid #e4e4e7;
    border-radius: 999px;
    background: #fff;
    color: #18181b;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
  }

  .directions-route-chips__pill:hover,
  .directions-route-chips__pill:focus-visible {
    background: #f4f4f5;
  }

  .directions-route-chips__stop {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    padding-left: 0.05rem;
  }

  .directions-route-chips__badge {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    border-radius: 999px;
    background: var(--color-brand, #8d1437);
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
    color: #18181b;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .directions-route-chips__actions {
    display: flex;
    flex: 0 0 auto;
    gap: 0.1rem;
  }

  .directions-route-chips__icon {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: none;
    border-radius: 0.4rem;
    background: #f4f4f5;
    color: #3f3f46;
    cursor: pointer;
  }

  .directions-route-chips__icon:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .directions-route-chips__icon:not(:disabled):hover,
  .directions-route-chips__icon:not(:disabled):focus-visible {
    background: #e4e4e7;
  }

  .directions-route-chips__side {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .directions-route-chips__icon-btn {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    /* 44px targets. */
    width: 2.75rem;
    height: 2.5rem;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: #3f3f46;
    cursor: pointer;
  }

  .directions-route-chips__icon-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .directions-route-chips__icon-btn:not(:disabled):hover,
  .directions-route-chips__icon-btn:not(:disabled):focus-visible {
    background: #f4f4f5;
  }
</style>
