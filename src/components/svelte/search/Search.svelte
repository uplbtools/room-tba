<script lang="ts">
  import { throttle } from "es-toolkit";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import SearchIcon from "@lucide/svelte/icons/search";
  import { getAppData } from "../../../lib/context";
  import { getMapChromeVisibility } from "../../../lib/map-chrome";
  import { queryStore } from "../../../lib/store.svelte";
  import EventCards from "./EventCards.svelte";
  import Suggestions from "./Suggestions.svelte";

  let searchElement = $state<HTMLInputElement | null>(null);
  let containerEl = $state<HTMLDivElement | null>(null);
  let typing = $state(false);
  let eventsCollapsed = $state(true);
  let searchCollapsed = $state(false);

  const appData = getAppData();
  const { events, loaded } = $derived(appData());
  const chrome = $derived(getMapChromeVisibility());
  const activeEvents = $derived(
    loaded ? events.filter((event) => event.status === "active") : [],
  );

  const searchTabHint = $derived.by(() => {
    const input = queryStore.inputValue.trim();
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
    if (!chrome.showSearchSuggestions && searchCollapsed) {
      searchCollapsed = false;
    }
  });

  $effect(() => {
    const el = containerEl;
    if (!el || typeof ResizeObserver === "undefined") return;

    const root = el.closest(".app-layout") as HTMLElement | null;
    if (!root) return;

    const syncHeight = () => {
      root.style.setProperty(
        "--search-block-height",
        `${el.getBoundingClientRect().height}px`,
      );
    };

    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(el);
    return () => observer.disconnect();
  });

  const throttleSearch = throttle((searchInput: string) => {
    queryStore.inputValue = searchInput;
    queryStore.setType("query");
  }, 400);

  function handleInput(
    event: Event & { currentTarget: EventTarget & HTMLInputElement },
  ) {
    throttleSearch(event.currentTarget.value);
  }

  function closeSearchContext() {
    queryStore.clearQuery();
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
  }

  const clearSelectionLabel = $derived(
    queryStore.type === "result" && queryStore.category !== null
      ? "Close details"
      : "Clear search",
  );

  const showIdleEventsChrome = $derived(
    chrome.showEventsShelf &&
      queryStore.category === null &&
      queryStore.inputValue === "",
  );
</script>

<div
  bind:this={containerEl}
  class="search-filter-container"
  class:search-collapsed={searchCollapsed}
  class:search-focused={queryStore.type !== "result" &&
    chrome.showSearchSuggestions}
  class:edit-chrome-suppressed={!chrome.showSearchSuggestions}
>
  {#if searchCollapsed}
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
      <ChevronDown size={18} aria-hidden="true" />
    </button>
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
            <input
              type="text"
              id="search"
              autocomplete="off"
              value={queryStore.inputValue}
              bind:this={searchElement}
              class={typing ? "typing" : ""}
              oninput={handleInput}
              placeholder="Search room, building, dorm, event, division..."
            />
            {#if typing}
              <div class="loading-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 200 200"
                  width="20"
                  height="20"
                >
                  <circle stroke-width="17" r="15" cx="40" cy="65"
                    ><animate
                      attributeName="cy"
                      calcMode="spline"
                      dur="0.8"
                      values="65;135;65;"
                      keySplines=".5 0 .5 1;.5 0 .5 1"
                      repeatCount="indefinite"
                      begin="-.4"
                    ></animate></circle
                  >
                  <circle stroke-width="17" r="15" cx="100" cy="65"
                    ><animate
                      attributeName="cy"
                      calcMode="spline"
                      dur="0.8"
                      values="65;135;65;"
                      keySplines=".5 0 .5 1;.5 0 .5 1"
                      repeatCount="indefinite"
                      begin="-.2"
                    ></animate></circle
                  >
                  <circle stroke-width="17" r="15" cx="160" cy="65"
                    ><animate
                      attributeName="cy"
                      calcMode="spline"
                      dur="0.8"
                      values="65;135;65;"
                      keySplines=".5 0 .5 1;.5 0 .5 1"
                      repeatCount="indefinite"
                      begin="0"
                    ></animate></circle
                  >
                </svg>
              </div>
            {/if}
          </div>

          <div class="search-buttons">
            {#if queryStore.inputValue !== "" || queryStore.category !== null}
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
            {#if chrome.showSearchSuggestions}
              <button
                type="button"
                class="search-retract"
                aria-label="Collapse search bar"
                title="Collapse search bar"
                onclick={collapseSearch}
              >
                <ChevronUp size={18} aria-hidden="true" />
              </button>
            {/if}
          </div>
        </div>

        {#if chrome.showSearchSuggestions && eventsCollapsed}
          <Suggestions />
        {/if}

        {#if showIdleEventsChrome && !eventsCollapsed}
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

      {#if showIdleEventsChrome && eventsCollapsed}
        <button
          class="events-shelf-tab"
          type="button"
          aria-expanded="false"
          aria-controls="persistent-campus-events"
          aria-label="Expand campus events"
          onclick={toggleEventsShelf}
          disabled={!loaded}
        >
          <span class="events-shelf-tab-label">Campus events</span>
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      {/if}

      {#if chrome.showEventBanner && activeEvents.length > 0 && queryStore.category !== "event" && queryStore.category !== "events" && queryStore.inputValue === "" && eventsCollapsed}
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
    </div>
  {/if}
</div>

<style>
  .search-filter-container {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
    width: min(25.75rem, calc(50% - 4rem));
    max-width: 100%;
    flex-shrink: 0;
    min-height: 0;
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
    padding: 0.625rem 1rem;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: 0.8125rem;
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

  .search-tab :global(svg:last-child) {
    flex: 0 0 auto;
    margin-left: auto;
  }

  .search-input-stack {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    min-width: 0;
    z-index: 2;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: 0.8125rem;
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
    max-height: min(40vh, 22rem);
    overflow-y: auto;
    overscroll-behavior: contain;
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
    border-radius: 0.8125rem;
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
    border-radius: 0.75rem;
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
    padding: 0.75rem 1rem 0.75rem 2.75rem;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: 0.8125rem;
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
    .search-tab {
      border-radius: 2rem;
      min-height: 2.875rem;
    }

    .search-input-stack {
      border-radius: 2rem;
    }

    .search-filter-container:focus-within:not(.edit-chrome-suppressed)
      .search-input-stack {
      border-radius: 1.25rem;
    }

    .search-filter {
      pointer-events: auto;
    }
    .search-filter-container {
      width: 100%;
    }

    .events-shelf-tab {
      border-radius: 0.8125rem;
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
  }

  .search-retract {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid #d8b9ba;
    border-radius: 0.625rem;
    background: #fffafa;
    color: #7b1113;
    cursor: pointer;
  }

  .search-retract:hover,
  .search-retract:focus-visible {
    border-color: #c58f91;
    background: #fdf3f3;
  }

  .search-retract:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
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
</style>
