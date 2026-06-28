<script lang="ts">
  import { debounce } from "es-toolkit";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import Menu from "@lucide/svelte/icons/menu";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import { getAppData } from "@lib/context";
  import { getMapChromeVisibility } from "@lib/map-chrome";
  import {
    adminAuthStore,
    editorChromeStore,
    mapEditStore,
    mapToolsStore,
    proposalsStore,
    queryStore,
  } from "@lib/store.svelte";
  import EventCards from "./EventCards.svelte";
  import Suggestions from "./Suggestions.svelte";
  import BuildingTypeFilterBar from "@ui/BuildingTypeFilterBar.svelte";
  import EditorShelf from "@ui/EditorShelf.svelte";
  import MapChromeToggleButton from "@ui/map-chrome/MapChromeToggleButton.svelte";
  import { observeBlockHeight } from "@lib/layout-css-vars";
  import { MediaQuery } from "svelte/reactivity";

  let searchElement = $state<HTMLInputElement | null>(null);
  let shellMainEl = $state<HTMLDivElement | null>(null);
  let chromeEl = $state<HTMLDivElement | null>(null);
  let draftInput = $state("");
  let eventsCollapsed = $state(true);
  let searchFocused = $state(false);
  const mobile = new MediaQuery("max-width:48rem");

  const appData = getAppData();
  const { loaded } = $derived(appData());
  const chrome = $derived(getMapChromeVisibility());

  $effect(() => {
    const el = mobile.current ? shellMainEl : chromeEl;
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

  function openEventsShelf() {
    searchFocused = false;
    searchElement?.blur();
    eventsCollapsed = false;
  }

  function closeEventsShelf() {
    eventsCollapsed = true;
  }

  function toggleEventsShelf() {
    if (eventsCollapsed) {
      openEventsShelf();
    } else {
      closeEventsShelf();
    }
  }

  const clearSelectionLabel = $derived(
    queryStore.type === "result" && queryStore.category !== null
      ? "Close details"
      : "Clear search",
  );

  const showIdleEventsChrome = $derived(
    chrome.showEventsShelf && queryStore.category === null && draftInput === "",
  );

  function closeEditorShelf() {
    editorChromeStore.closeShelf();
  }

  function openEditorShelf() {
    searchFocused = false;
    searchElement?.blur();
    closeEventsShelf();
    editorChromeStore.openShelf();
  }

  function toggleEditorShelf() {
    if (editorChromeStore.shelfOpen) {
      closeEditorShelf();
    } else {
      openEditorShelf();
    }
  }

  const showEditorChrome = $derived(
    chrome.showEditorShelf &&
      (adminAuthStore.canPublish || adminAuthStore.canReview),
  );

  const editorChipLabel = $derived(
    mapEditStore.enabled ? "Editing" : "Editor",
  );

  const showSearchDropdown = $derived(
    chrome.showSearchSuggestions &&
      searchFocused &&
      eventsCollapsed &&
      !editorChromeStore.shelfOpen,
  );

  const showEventsSheet = $derived(showIdleEventsChrome && !eventsCollapsed);

  const showEditorSheet = $derived(showEditorChrome && editorChromeStore.shelfOpen);

  $effect(() => {
    if (draftInput.trim() !== "") {
      closeEventsShelf();
      closeEditorShelf();
    }
  });

  $effect(() => {
    if (queryStore.category !== null && queryStore.type === "result") {
      closeEventsShelf();
      closeEditorShelf();
      searchElement?.blur();
    }
  });

  $effect(() => {
    if (editorChromeStore.shelfOpen) {
      closeEventsShelf();
    }
  });

  $effect(() => {
    if (chrome.editMode) {
      closeEditorShelf();
    }
  });
</script>

<div
  class="search-root"
  class:mobile-shell={mobile.current}
  class:search-input-focused={searchFocused}
  class:events-panel-open={showEventsSheet}
  class:editor-panel-open={showEditorSheet}
>
  <div class="search-shell-main" bind:this={shellMainEl}>
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

    <div bind:this={chromeEl} class="map-search-chrome">
      <div class="map-search-chrome__bar">
        <div class="map-search-chrome__pill-wrap">
          <div class="map-search-chrome__pill">
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
              aria-hidden="true"
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
              onfocus={() => {
                searchFocused = true;
              }}
              onblur={() => {
                searchFocused = false;
              }}
              placeholder="Search room, building, dorm, event, division..."
            />
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
                  aria-hidden="true"
                  ><line x1="18" y1="6" x2="6" y2="18"></line><line
                    x1="6"
                    y1="6"
                    x2="18"
                    y2="18"
                  ></line></svg
                >
              </button>
            {/if}
          </div>

          {#if showSearchDropdown}
            <div class="map-search-chrome__dropdown" role="listbox">
              <Suggestions />
            </div>
          {/if}
        </div>
      </div>

      {#if chrome.showSearchSuggestions}
        <div class="map-search-chrome__chips">
          {#if showIdleEventsChrome}
            <button
              type="button"
              class="map-chrome-chip"
              class:map-chrome-chip--toggle-active={showEventsSheet}
              aria-expanded={showEventsSheet}
              aria-controls="persistent-campus-events"
              aria-label={showEventsSheet
                ? "Close campus events"
                : "Open campus events"}
              onclick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                closeEditorShelf();
                toggleEventsShelf();
              }}
              disabled={!loaded}
            >
              <CalendarDays size={14} aria-hidden="true" />
              <span>Events</span>
            </button>
          {/if}
          {#if showEditorChrome}
            <button
              type="button"
              class="map-chrome-chip"
              class:map-chrome-chip--toggle-active={showEditorSheet}
              class:map-chrome-chip--editor-active={mapEditStore.enabled}
              aria-expanded={showEditorSheet}
              aria-controls="editor-shelf-panel"
              aria-label={showEditorSheet
                ? "Close editor tools"
                : "Open editor tools"}
              onclick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleEditorShelf();
              }}
            >
              <ShieldCheck size={14} aria-hidden="true" />
              <span>{editorChipLabel}</span>
              {#if proposalsStore.pendingCount > 0}
                <span class="map-chrome-chip__count"
                  >{proposalsStore.pendingCount}</span
                >
              {/if}
            </button>
          {/if}
          <BuildingTypeFilterBar />
        </div>
      {/if}

      {#if showEventsSheet}
        <div
          class="map-search-chrome__events"
          id="persistent-campus-events"
          aria-labelledby="persistent-campus-events-heading"
        >
          <EventCards
            headingId="persistent-campus-events-heading"
            showHeading={false}
            showRetract={false}
            oncollapse={closeEventsShelf}
          />
        </div>
      {/if}

      {#if showEditorSheet}
        <div
          class="map-search-chrome__editor"
          id="editor-shelf-panel"
          aria-label="Editor tools"
        >
          <EditorShelf onclose={closeEditorShelf} />
        </div>
      {/if}
    </div>
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
    display: block;
    width: 100%;
    pointer-events: none;
  }

  .search-root.mobile-shell .search-shell-main {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    column-gap: 0.375rem;
    row-gap: 0;
    width: 100%;
    padding: calc(env(safe-area-inset-top, 0px) + 0.4375rem) 0.625rem 0.4375rem;
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    border-bottom: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    box-shadow: var(--map-chrome-shadow);
    pointer-events: auto;
  }

  .search-root.mobile-shell .map-search-chrome {
    display: contents;
  }

  .search-root.mobile-shell .map-menu-btn {
    grid-column: 1;
    grid-row: 1;
    align-self: center;
    margin: 0;
  }

  .search-root.mobile-shell .map-search-chrome__bar {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
    padding: 0;
  }

  .search-root.mobile-shell .map-search-chrome__chips {
    grid-column: 1 / -1;
    grid-row: 2;
    padding: 0.4375rem 0 0.1875rem;
    border-top: 1px solid hsl(0, 0%, 92%);
  }

  .search-root.mobile-shell .map-search-chrome__events,
  .search-root.mobile-shell .map-search-chrome__editor {
    grid-column: 1 / -1;
    grid-row: 3;
    padding: 0.375rem 0 0;
  }

  .search-root:not(.mobile-shell) .map-search-chrome {
    width: min(25.75rem, calc(50% - 4rem));
    max-width: 100%;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: var(--map-chrome-radius, 1rem);
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    box-shadow:
      0 2px 6px hsla(0, 0%, 0%, 0.18),
      0 8px 20px hsla(0, 0%, 0%, 0.14);
    overflow: visible;
  }

  .map-search-chrome {
    display: flex;
    flex-direction: column;
    min-width: 0;
    pointer-events: auto;
  }

  .map-search-chrome__bar {
    padding: 0.625rem 0.75rem;
  }

  .search-root:not(.mobile-shell) .map-search-chrome__bar {
    padding: 0.5rem 0.625rem;
  }

  .map-search-chrome__pill-wrap {
    position: relative;
    min-width: 0;
  }

  .map-search-chrome__pill {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    min-height: 2.5rem;
    padding: 0.375rem 0.625rem;
    border: 1px solid hsl(0, 0%, 88%);
    border-radius: 999px;
    background-color: hsl(0, 0%, 97%);
  }

  .search-root.mobile-shell .map-search-chrome__pill {
    border-color: transparent;
    background-color: hsl(0, 0%, 96%);
  }

  .search-icon {
    flex: 0 0 auto;
    color: hsl(0, 0%, 28%);
  }

  input[type="text"] {
    flex: 1 1 auto;
    min-width: 0;
    border: none;
    outline: none;
    font-size: 0.875rem;
    color: #18181b;
    background: transparent;
    text-overflow: ellipsis;
  }

  input[type="text"]::placeholder {
    color: #6b6b6b;
  }

  .clear-btn {
    all: unset;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: hsl(0, 0%, 28%);
    border-radius: 999px;
    padding: 0.125rem;
  }

  .clear-btn:hover,
  .clear-btn:focus-visible {
    background-color: hsla(0, 0%, 0%, 0.08);
  }

  .clear-btn:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 1px;
  }

  .map-search-chrome__dropdown {
    position: absolute;
    top: calc(100% + 0.375rem);
    left: 0;
    right: 0;
    z-index: 8;
    overflow: hidden;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: var(--map-chrome-radius, 1rem);
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    box-shadow: var(--map-chrome-shadow);
  }

  .map-search-chrome__dropdown :global(.suggestions-container) {
    display: flex;
    border-top: none;
    max-height: min(50dvh, 18rem);
  }

  .map-search-chrome__chips {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 0.4375rem 0.625rem 0.4375rem;
    border-top: 1px solid hsl(0, 0%, 92%);
  }

  .search-root:not(.mobile-shell) .map-search-chrome__chips {
    border-bottom-left-radius: calc(var(--map-chrome-radius, 1rem) - 1px);
    border-bottom-right-radius: calc(var(--map-chrome-radius, 1rem) - 1px);
  }

  .map-search-chrome__chips:hover,
  .map-search-chrome__chips:focus-within {
    scrollbar-width: thin;
    scrollbar-color: hsl(0, 0%, 72%) transparent;
  }

  .map-search-chrome__chips::-webkit-scrollbar {
    height: 0;
  }

  .map-search-chrome__chips:hover::-webkit-scrollbar,
  .map-search-chrome__chips:focus-within::-webkit-scrollbar {
    height: 3px;
  }

  .map-search-chrome__chips::-webkit-scrollbar-track {
    background: transparent;
  }

  .map-search-chrome__chips::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background-color: hsl(0, 0%, 72%);
  }

  .map-search-chrome__chips:hover::-webkit-scrollbar-thumb {
    background-color: hsl(0, 0%, 58%);
  }

  .map-search-chrome__chips :global(.building-filter-bar) {
    flex: 0 0 auto;
    min-width: 0;
    padding: 0 !important;
  }

  .map-search-chrome__events {
    display: flex;
    flex-direction: column;
    min-height: 0;
    max-height: min(50dvh, 22rem);
    overflow: hidden;
    overscroll-behavior: contain;
    border-top: 1px solid hsl(0, 0%, 92%);
    padding: 0.375rem 0.625rem 0.625rem;
    -webkit-overflow-scrolling: touch;
  }

  .map-search-chrome__events :global(.events-section) {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1 1 auto;
    gap: 0.375rem;
  }

  .map-search-chrome__events :global(.section-actions--inline) {
    flex: 0 0 auto;
  }

  .map-search-chrome__events :global(.event-list) {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  .map-search-chrome__editor {
    display: flex;
    flex-direction: column;
    min-height: 0;
    max-height: min(50dvh, 24rem);
    overflow-y: auto;
    overscroll-behavior: contain;
    border-top: 1px solid hsl(0, 0%, 92%);
    padding: 0.375rem 0.625rem 0.625rem;
    -webkit-overflow-scrolling: touch;
  }
</style>
