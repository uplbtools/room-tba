<script lang="ts">
  import { debounce } from "es-toolkit";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import SearchIcon from "@lucide/svelte/icons/search";
  import Menu from "@lucide/svelte/icons/menu";
  import { getAppData } from "@lib/context";
  import { getMapChromeVisibility } from "@lib/map-chrome";
  import { mapToolsStore, queryStore } from "@lib/store.svelte";
  import EventCards from "./EventCards.svelte";
  import Suggestions from "./Suggestions.svelte";
  import BuildingTypeFilterBar from "@ui/BuildingTypeFilterBar.svelte";
  import MapChromeToggleButton from "@ui/map-chrome/MapChromeToggleButton.svelte";
  import MapChromeToggleIcon from "@ui/map-chrome/MapChromeToggleIcon.svelte";
  import { observeBlockHeight } from "@lib/layout-css-vars";
  import { MediaQuery } from "svelte/reactivity";

  let searchElement = $state<HTMLInputElement | null>(null);
  let containerEl = $state<HTMLDivElement | null>(null);
  /** Immediate input text; queryStore.inputValue updates debounced for search work. */
  let draftInput = $state("");
  let eventsCollapsed = $state(true);
  let searchCollapsed = $state(false);
  const mobile = new MediaQuery("max-width:48rem");

  const appData = getAppData();
  const { events, loaded } = $derived(appData());
  const chrome = $derived(getMapChromeVisibility());
  const activeEvents = $derived(
    loaded ? events.filter((event) => event.status === "active") : [],
  );

  const searchTabHint = $derived.by(() => {
    const input = draftInput.trim();
    if (input) return input;
    if (queryStore.category !== null && queryStore.queryValue) {
      return queryStore.queryValue;
    }
    return null;
  });

  const expandSearchLabel = $derived(
    searchTabHint
      ? `Expand search bar, current context: ${searchTabHint}`
      : "Expand search bar",
  );

  $effect(() => {
    const el = containerEl;
    if (!el) return;
    return observeBlockHeight(el, "--search-block-height");
  });

  const commitSearchInput = debounce((searchInput: string) => {
    queryStore.inputValue = searchInput;
    queryStore.setType("query");
  }, 200);

  $effect(() => {
    if (queryStore.type === "result" || queryStore.category !== null) {
      draftInput = queryStore.inputValue;
      return;
    }
    if (queryStore.inputValue === "") {
      draftInput = "";
    }
  });

  function handleInput(
    event: Event & { currentTarget: EventTarget & HTMLInputElement },
  ) {
    if (queryStore.type === "result" || queryStore.category !== null) {
      queryStore.exitResultMode();
    }
    draftInput = event.currentTarget.value;
    commitSearchInput(draftInput);
  }

  function closeSearchContext() {
    commitSearchInput.cancel();
    queryStore.clearQuery();
    draftInput = "";
    searchElement?.focus();
  }

  function toggleEventsShelf() {
    eventsCollapsed = !eventsCollapsed;
    if (!eventsCollapsed) {
      searchElement?.blur();
    }
  }

  function collapseSearch() {
    searchElement?.blur();
    searchCollapsed = true;
  }

  function expandSearch() {
    searchCollapsed = false;
    queueMicrotask(() => searchElement?.focus());
  }

  function openActiveEvent(event: (typeof activeEvents)[number]) {
    queryStore.updateQuery({
      category: "event",
      type: "result",
      value: event.title,
      eventSlug: event.slug,
    });
    queryStore.inputValue = "";
    draftInput = "";
    searchElement?.blur();
  }

  const clearSelectionLabel = $derived(
    queryStore.type === "result" && queryStore.category !== null
      ? "Close details"
      : "Clear search",
  );

  const showIdleEventsChrome = $derived(
    chrome.showEventsShelf && queryStore.category === null && draftInput === "",
  );

  const showMobileIntegratedEvents = $derived(
    mobile.current &&
      showIdleEventsChrome &&
      draftInput === "" &&
      queryStore.category === null,
  );

  $effect(() => {
    if (mobile.current) {
      searchCollapsed = false;
    }
  });

  $effect(() => {
    if (
      mobile.current &&
      queryStore.category !== null &&
      queryStore.type === "result"
    ) {
      eventsCollapsed = true;
      searchElement?.blur();
    }
  });
</script>

<div class="search-root" class:mobile-shell={mobile.current}>
  {#if mobile.current}
    <MapChromeToggleButton
      class="map-menu-btn"
      ariaLabel="Map menu"
      ariaExpanded={mapToolsStore.open}
      ariaControls="map-tools-panel"
      title="Map menu"
      onclick={() => mapToolsStore.toggle()}
    >
      <Menu size={20} aria-hidden="true" />
    </MapChromeToggleButton>
  {/if}
  <div bind:this={containerEl} class="search-top-stack">
    <div
      class="search-filter-container"
      class:search-collapsed={searchCollapsed}
      class:search-focused={queryStore.type !== "result" &&
        chrome.showSearchSuggestions}
      class:edit-chrome-suppressed={!chrome.showSearchSuggestions}
    >
      {#if searchCollapsed && !mobile.current}
        <button
          class="search-tab"
          type="button"
          aria-expanded="false"
          aria-controls="search-chrome"
          aria-label={expandSearchLabel}
          title="Expand search bar"
          onclick={expandSearch}
        >
          <SearchIcon size={18} aria-hidden="true" />
          <span class="search-tab-label">Search</span>
          {#if searchTabHint}
            <span class="search-tab-context">{searchTabHint}</span>
          {/if}
          <MapChromeToggleIcon class="search-tab-toggle">
            <ChevronDown size={18} />
          </MapChromeToggleIcon>
        </button>

        {#if showIdleEventsChrome}
          {#if !eventsCollapsed}
            <div class="search-input-stack events-only-stack">
              <section
                id="persistent-campus-events"
                class="events-shelf-panel events-shelf-panel-standalone"
                aria-labelledby="persistent-campus-events-heading"
              >
                <EventCards
                  headingId="persistent-campus-events-heading"
                  showHeading={true}
                  showRetract={true}
                  oncollapse={toggleEventsShelf}
                />
              </section>
            </div>
          {:else}
            <button
              class="events-shelf-tab"
              type="button"
              aria-expanded={!eventsCollapsed}
              aria-controls="persistent-campus-events"
              aria-label="Expand campus events"
              onclick={toggleEventsShelf}
              disabled={!loaded}
            >
              <span class="events-shelf-tab-label">Campus events</span>
              <MapChromeToggleIcon>
                <ChevronDown size={18} />
              </MapChromeToggleIcon>
            </button>
          {/if}
        {/if}

        {#if chrome.showEventBanner && activeEvents.length > 0 && queryStore.category !== "event" && queryStore.category !== "events" && draftInput === "" && eventsCollapsed}
          <div class="event-banner-stack" role="status" aria-live="polite">
            {#each activeEvents as activeEvent (activeEvent.slug)}
              <button
                class="event-banner"
                type="button"
                aria-label={`${activeEvent.title} is happening now. Tap to see it on the map.`}
                onclick={() => openActiveEvent(activeEvent)}
              >
                <span class="event-banner-badge" aria-hidden="true">Live</span>
                <span class="event-banner-copy">
                  <span class="event-banner-title">{activeEvent.title}</span>
                  <span class="event-banner-meta">Happening now</span>
                </span>
                <span class="event-banner-cta" aria-hidden="true"
                  >Open on map</span
                >
              </button>
            {/each}
          </div>
        {/if}
      {:else}
        <div id="search-chrome" class="search-chrome">
          <div class="search-input-stack">
            <div class="search-filter">
              <div class="search-container">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="search-icon"
                  ><circle cx="11" cy="11" r="8" /><line
                    x1="21"
                    y1="21"
                    x2="16.65"
                    y2="16.65"
                  /></svg
                >
                <label class="sr-only" for="search">Search campus</label>
                <input
                  type="text"
                  id="search"
                  autocomplete="off"
                  value={draftInput}
                  bind:this={searchElement}
                  oninput={handleInput}
                  placeholder="Search room, building, dorm, event, division..."
                />
              </div>

              <div class="search-buttons">
                {#if draftInput !== "" || queryStore.category !== null}
                  <button
                    onclick={closeSearchContext}
                    type="button"
                    class="clear-btn"
                    aria-label={clearSelectionLabel}
                    title={clearSelectionLabel}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><line x1="18" y1="6" x2="6" y2="18"></line><line
                        x1="6"
                        y1="6"
                        x2="18"
                        y2="18"
                      ></line></svg
                    >
                  </button>
                {/if}
                {#if chrome.showSearchSuggestions && !mobile.current}
                  <MapChromeToggleButton
                    ariaLabel="Collapse search bar"
                    title="Collapse search bar"
                    onclick={collapseSearch}
                  >
                    <ChevronUp size={18} aria-hidden="true" />
                  </MapChromeToggleButton>
                {/if}
              </div>
            </div>

            {#if chrome.showSearchSuggestions && eventsCollapsed}
              <Suggestions />
            {/if}

            {#if showMobileIntegratedEvents}
              <section
                id="persistent-campus-events"
                class="events-shelf-panel mobile-integrated-events"
                aria-labelledby="persistent-campus-events-heading"
              >
                <EventCards
                  headingId="persistent-campus-events-heading"
                  showHeading={false}
                  showRetract={false}
                />
              </section>
            {/if}

            {#if showIdleEventsChrome && !eventsCollapsed && !mobile.current}
              <section
                id="persistent-campus-events"
                class="events-shelf-panel"
                aria-labelledby="persistent-campus-events-heading"
              >
                <EventCards
                  headingId="persistent-campus-events-heading"
                  showHeading={true}
                  showRetract={true}
                  oncollapse={toggleEventsShelf}
                />
              </section>
            {/if}
          </div>

          {#if showIdleEventsChrome && eventsCollapsed && !mobile.current}
            <button
              class="events-shelf-tab"
              type="button"
              aria-expanded={!eventsCollapsed}
              aria-controls="persistent-campus-events"
              aria-label="Expand campus events"
              onclick={toggleEventsShelf}
              disabled={!loaded}
            >
              <span class="events-shelf-tab-label">Campus events</span>
              <MapChromeToggleIcon>
                <ChevronDown size={18} />
              </MapChromeToggleIcon>
            </button>
          {/if}

          {#if chrome.showEventBanner && activeEvents.length > 0 && queryStore.category !== "event" && queryStore.category !== "events" && draftInput === "" && eventsCollapsed && !mobile.current}
            <div class="event-banner-stack" role="status" aria-live="polite">
              {#each activeEvents as activeEvent (activeEvent.slug)}
                <button
                  class="event-banner"
                  type="button"
                  aria-label={`${activeEvent.title} is happening now. Tap to see it on the map.`}
                  onclick={() => openActiveEvent(activeEvent)}
                >
                  <span class="event-banner-badge" aria-hidden="true">Live</span
                  >
                  <span class="event-banner-copy">
                    <span class="event-banner-title">{activeEvent.title}</span>
                    <span class="event-banner-meta">Happening now</span>
                  </span>
                  <span class="event-banner-cta" aria-hidden="true"
                    >Open on map</span
                  >
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
    {#if chrome.showSearchSuggestions}
      <div class="building-filter-slot">
        <BuildingTypeFilterBar />
      </div>
    {/if}
  </div>
</div>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .search-root {
    display: contents;
  }

  .search-root.mobile-shell {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    width: 100%;
    padding-top: env(safe-area-inset-top, 0px);
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    border-bottom: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    box-shadow: var(
      --map-chrome-panel-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.14),
      0 4px 14px hsla(0, 0%, 0%, 0.2),
      0 10px 28px hsla(0, 0%, 0%, 0.12)
    );
    pointer-events: auto;
  }

  .search-top-stack {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: min(25.75rem, calc(50% - 4rem));
    max-width: 100%;
    min-width: 0;
    flex-shrink: 0;
    max-height: calc(
      100dvh - var(--status-bar-block-height, 2.75rem) -
        env(safe-area-inset-bottom, 0px) - var(--map-ui-padding, 0.5rem) * 2
    );
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    pointer-events: auto;
    position: relative;
    z-index: 4;
  }

  .search-root.mobile-shell .search-top-stack {
    grid-column: 2;
    width: auto;
    max-height: calc(
      100dvh - var(--status-bar-block-height, 2.75rem) -
        env(safe-area-inset-bottom, 0px) - 0.5rem
    );
  }

  .building-filter-slot {
    min-width: 0;
    padding-top: 0.125rem;
    pointer-events: auto;
  }

  .search-root.mobile-shell .building-filter-slot {
    padding-top: 0;
  }

  .map-menu-btn {
    margin: 0.4375rem 0 0.4375rem 0.625rem;
  }

  .search-filter-container {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
    width: 100%;
    min-width: 0;
    pointer-events: auto;
  }

  .search-chrome {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
    min-width: 0;
    width: 100%;
  }

  .search-tab {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    max-width: 100%;
    min-height: 2.75rem;
    padding: 0.875rem 1rem;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: var(--map-chrome-radius, 1rem);
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    box-shadow: var(
      --map-chrome-panel-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.14),
      0 4px 14px hsla(0, 0%, 0%, 0.2),
      0 10px 28px hsla(0, 0%, 0%, 0.12)
    );
    color: #18181b;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.2;
    pointer-events: auto;
  }

  .search-tab:hover,
  .search-tab:focus-visible {
    border-color: #d8b9ba;
    background-color: #fdf3f3;
  }

  .search-tab:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }

  .search-tab-label {
    flex: 0 0 auto;
  }

  .search-tab-context {
    min-width: 0;
    overflow: hidden;
    color: hsl(0, 0%, 42%);
    font-size: 0.8125rem;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search-tab-toggle {
    margin-left: auto;
  }

  .search-input-stack {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    min-width: 0;
    z-index: 2;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: var(--map-chrome-radius, 1rem);
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    backdrop-filter: blur(10px);
    box-shadow: var(
      --map-chrome-panel-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.14),
      0 4px 14px hsla(0, 0%, 0%, 0.2),
      0 10px 28px hsla(0, 0%, 0%, 0.12)
    );
    overflow: hidden;
  }

  .search-input-stack :global(.suggestions-container) {
    display: none;
  }

  .search-filter-container:focus-within:not(.edit-chrome-suppressed)
    .search-input-stack
    :global(.suggestions-container) {
    display: flex;
  }

  .search-focused:focus-within .search-input-stack,
  .search-filter-container:focus-within .search-input-stack {
    z-index: 3;
  }

  .search-input-stack:focus-within ~ .event-banner-stack,
  .search-input-stack:focus-within ~ .events-shelf-tab {
    display: none;
  }

  .events-shelf-panel {
    border-top: 1px solid hsl(0, 0%, 90%);
    padding: 0.5rem 0.75rem 0.75rem;
    overscroll-behavior: contain;
  }

  .events-only-stack {
    z-index: 2;
  }

  .events-shelf-panel-standalone {
    border-top: none;
  }

  .mobile-integrated-events {
    border-top: 1px solid hsl(0, 0%, 92%);
    padding: 0.375rem 0.625rem 0.5rem;
    max-height: none;
    overflow: visible;
  }

  .search-root.mobile-shell
    .search-filter:focus-within
    ~ .mobile-integrated-events,
  .search-root.mobile-shell
    .search-suggestions:focus-within
    ~ .mobile-integrated-events {
    display: none;
  }

  .search-root.mobile-shell .search-filter {
    padding: 0.625rem 0.75rem;
  }

  .search-root.mobile-shell .map-menu-btn {
    margin-top: 0.3125rem;
    margin-bottom: 0.3125rem;
  }

  .event-banner-stack {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    flex-shrink: 0;
    min-width: 0;
    pointer-events: none;
  }

  .event-banner {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    border: 1px solid #eee1e1;
    border-radius: var(--map-chrome-radius, 1rem);
    background: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    color: #18181b;
    cursor: pointer;
    text-align: left;
    padding: 0.45rem 0.625rem;
    pointer-events: auto;
    box-shadow: var(
      --map-chrome-panel-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.14),
      0 4px 14px hsla(0, 0%, 0%, 0.2),
      0 10px 28px hsla(0, 0%, 0%, 0.12)
    );
    transition:
      background-color 0.16s,
      border-color 0.16s;
  }

  .event-banner:hover,
  .event-banner:focus-visible {
    background: #fdf3f3;
    border-color: #d8b9ba;
  }

  .event-banner:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }

  .event-banner-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: calc(var(--map-chrome-radius, 1rem) * 0.75);
    background: #7b1113;
    color: white;
    font-size: 0.7rem;
    font-weight: 800;
    line-height: 1;
    text-transform: uppercase;
  }

  .event-banner-copy {
    display: grid;
    min-width: 0;
    gap: 0.2rem;
  }

  .event-banner-title {
    overflow: hidden;
    color: #18181b;
    font-size: 0.875rem;
    font-weight: 800;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-banner-meta {
    overflow: hidden;
    color: #71717a;
    font-size: 0.75rem;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-banner-cta {
    flex: 0 0 auto;
    color: #7b1113;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1.2;
    white-space: nowrap;
  }

  .search-filter {
    display: flex;
    align-items: center;
    padding: 0.875rem 1rem;
    gap: 0.5rem;
    flex-shrink: 0;
    border: none;
    background: transparent;
    box-shadow: none;
  }

  .events-shelf-tab {
    all: unset;
    box-sizing: border-box;
    display: flex;
    width: 100%;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    min-width: 0;
    max-width: 100%;
    min-height: 2.75rem;
    padding: 0.875rem 1rem;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: var(--map-chrome-radius, 1rem);
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    box-shadow: var(
      --map-chrome-panel-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.14),
      0 4px 14px hsla(0, 0%, 0%, 0.2),
      0 10px 28px hsla(0, 0%, 0%, 0.12)
    );
    color: #18181b;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.2;
  }

  .events-shelf-tab:disabled {
    cursor: default;
    opacity: 0.7;
  }

  .events-shelf-tab-label {
    min-width: 0;
    flex: 1;
    padding-left: 1.75rem;
  }

  .events-shelf-tab:hover:not(:disabled),
  .events-shelf-tab:focus-visible {
    border-color: #d8b9ba;
    background-color: #fdf3f3;
  }

  .events-shelf-tab:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }

  @media screen and (max-width: 48rem) {
    .search-root.mobile-shell .search-filter-container {
      width: 100%;
      max-width: none;
      gap: 0;
    }

    .search-root.mobile-shell .search-tab,
    .search-root.mobile-shell .search-input-stack,
    .search-root.mobile-shell .events-shelf-tab,
    .search-root.mobile-shell .events-shelf-panel-standalone {
      border: none;
      border-radius: 0;
      box-shadow: none;
    }

    .search-root.mobile-shell .search-tab,
    .search-root.mobile-shell .search-filter {
      border-bottom: 1px solid hsl(0, 0%, 92%);
    }

    .search-root.mobile-shell .events-shelf-tab,
    .search-root.mobile-shell .event-banner-stack {
      display: none;
    }

    .search-filter {
      pointer-events: auto;
    }
    .search-filter-container {
      width: 100%;
    }

    .event-banner-cta {
      display: none;
    }

    .event-banner {
      grid-template-columns: auto minmax(0, 1fr);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .event-banner {
      transition: none;
    }
  }

  .search-container {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .search-icon {
    position: absolute;
    left: 0;
    color: black;
  }

  input[type="text"] {
    width: 100%;
    border: none;
    outline: none;
    padding-left: 1.75rem;
    font-size: 0.875rem;
    color: black;
    background: transparent;
    text-overflow: ellipsis;
  }

  input[type="text"]::placeholder {
    color: #6b6b6b;
  }

  .search-buttons {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-shrink: 0;
  }

  .clear-btn,
  .filter-btn {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: black;
    border-radius: 0.25rem;
    transition: background-color 0.125s;
  }

  .clear-btn:hover,
  .filter-btn:hover {
    background-color: #f0f0f0;
  }

  .loading-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 0.5rem;
  }

  .loading-icon svg {
    fill: #7b2d26;
    stroke: #7b2d26;
  }

  @media (max-width: 48rem) {
    .search-root.mobile-shell,
    .search-input-stack {
      backdrop-filter: none;
    }
  }
</style>
