<script lang="ts">
  import { onMount } from "svelte";
  import { debounce } from "es-toolkit";
  import { fade } from "svelte/transition";
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
  import TransitFilterChip from "@ui/TransitFilterChip.svelte";
  import TransitRoutePanel from "@ui/TransitRoutePanel.svelte";
  import { jeepneyStore } from "@lib/store.svelte";
  import EditorShelf from "@ui/EditorShelf.svelte";
  import MapDimensionToggle from "@ui/MapDimensionToggle.svelte";
  import MapChromeToggleButton from "@ui/map-chrome/MapChromeToggleButton.svelte";
  import CampusBrowseChips from "@ui/search/CampusBrowseChips.svelte";
  import { observeBlockHeight } from "@lib/layout-css-vars";
  import { registerSearchFocus } from "@lib/search-focus";
  import { registerEphemeralOverlayDismisser } from "@lib/overlay-stack";
  import {
    dropdownFadeIn,
    dropdownFadeOut,
    panelFadeIn,
    panelFadeOut,
  } from "@lib/motion";
  import { MediaQuery } from "svelte/reactivity";

  let searchElement = $state<HTMLInputElement | null>(null);
  let shellMainEl = $state<HTMLDivElement | null>(null);
  let chromeEl = $state<HTMLDivElement | null>(null);
  let draftInput = $state("");
  let eventsCollapsed = $state(true);
  let searchFocused = $state(false);
  const mobile = new MediaQuery("max-width:48rem");
  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  const appData = getAppData();
  const { loaded } = $derived(appData());
  const chrome = $derived(getMapChromeVisibility());

  $effect(() => {
    const el = mobile.current ? shellMainEl : chromeEl;
    if (!el) return;
    return observeBlockHeight(el, "--search-block-height");
  });

  onMount(() => {
    const unregisterFocus = registerSearchFocus(() => {
      searchElement?.focus();
      searchElement?.select();
    });
    const unregisterDismiss = registerEphemeralOverlayDismisser(() => {
      searchFocused = false;
      searchElement?.blur();
    });
    return () => {
      unregisterFocus();
      unregisterDismiss();
    };
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
    jeepneyStore.disableLayer();
    if (mobile.current) {
      mapToolsStore.close();
    }
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

  const editorChipLabel = $derived(mapEditStore.enabled ? "Editing" : "Editor");
  const editorOpenLabel = $derived(
    proposalsStore.pendingCount > 0
      ? `Open editor tools, ${proposalsStore.pendingCount} pending`
      : "Open editor tools",
  );

  const showSearchDropdown = $derived(
    chrome.showSearchSuggestions &&
      searchFocused &&
      eventsCollapsed &&
      !editorChromeStore.shelfOpen,
  );

  const showEventsSheet = $derived(showIdleEventsChrome && !eventsCollapsed);

  const showEditorSheet = $derived(
    showEditorChrome && editorChromeStore.shelfOpen,
  );
  const showEditorInline = $derived(showEditorSheet && !mobile.current);

  const showTransitRoutePanel = $derived(
    chrome.showSearchSuggestions &&
      jeepneyStore.layerActive &&
      !mapToolsStore.open,
  );

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
    if (jeepneyStore.layerActive) {
      closeEventsShelf();
      closeEditorShelf();
    }
  });

  $effect(() => {
    if (chrome.editMode) {
      closeEditorShelf();
    }
  });

  $effect(() => {
    if (mobile.current && mapToolsStore.open) {
      closeEventsShelf();
    }
  });
</script>

<div
  class="search-root"
  class:mobile-shell={mobile.current}
  class:search-input-focused={searchFocused}
  class:search-suggestions-open={showSearchDropdown}
  class:search-query-active={draftInput.trim() !== ""}
  class:events-panel-open={showEventsSheet}
  class:editor-panel-open={showEditorInline}
  class:transit-panel-open={showTransitRoutePanel}
>
  <div class="search-shell-main" bind:this={shellMainEl}>
    {#if mobile.current}
      <MapChromeToggleButton
        class="map-menu-btn"
        ariaLabel="Map menu"
        ariaExpanded={mapToolsStore.open}
        ariaControls="map-tools-panel"
        title="Map menu"
        onclick={() => {
          if (!mapToolsStore.open) {
            searchFocused = false;
            searchElement?.blur();
          }
          mapToolsStore.toggle();
        }}
      >
        <Menu size={20} aria-hidden="true" />
      </MapChromeToggleButton>
    {/if}

    <div bind:this={chromeEl} class="map-search-chrome">
      <div class="map-search-chrome__bar">
        <div class="map-search-chrome__bar-row">
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
                role="searchbox"
                enterkeyhint="search"
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
                aria-controls="search-suggestions"
                aria-autocomplete="list"
                aria-haspopup="listbox"
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
          </div>

          {#if showEditorChrome}
            <button
              type="button"
              class="map-search-chrome__editor-btn"
              class:map-search-chrome__editor-btn--active={showEditorSheet}
              class:map-search-chrome__editor-btn--editing={mapEditStore.enabled}
              aria-expanded={showEditorSheet}
              aria-controls={mobile.current
                ? "editor-screen"
                : "editor-shelf-panel"}
              aria-label={showEditorSheet
                ? "Close editor tools"
                : editorOpenLabel}
              title={showEditorSheet ? "Close editor tools" : editorChipLabel}
              onclick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleEditorShelf();
              }}
            >
              <ShieldCheck size={18} aria-hidden="true" />
              {#if proposalsStore.pendingCount > 0}
                <span class="map-search-chrome__editor-badge" aria-hidden="true"
                  >{proposalsStore.pendingCount}</span
                >
              {/if}
            </button>
          {/if}
        </div>
      </div>

      {#if showSearchDropdown}
          <div class="campus-browse-chips__container">
            {#if chrome.showSearchSuggestions}
            <CampusBrowseChips />
            {/if}
          </div>
        <!-- svelte-ignore a11y_interactive_supports_focus -->
        <div
          id="search-suggestions"
          class="map-search-chrome__suggestions"
          role="listbox"
          aria-label="Search suggestions"
          onmousedown={(event) => event.preventDefault()}
          in:fade={dropdownFadeIn(reducedMotion.current)}
          out:fade={dropdownFadeOut(reducedMotion.current)}
        >
          <Suggestions />
        </div>
      {/if}

      {#if (mobile.current || chrome.showSearchSuggestions || chrome.editMode) && !(showSearchDropdown && draftInput.trim() !== "")}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          class="map-search-chrome__chips"
          onmousedown={(event) => event.preventDefault()}
          role="list"
        >
          {#if mobile.current}
            <MapDimensionToggle compact />
          {/if}

          {#if chrome.showSearchSuggestions}
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
            <BuildingTypeFilterBar />
            <TransitFilterChip />
          {/if}
        </div>
      {/if}

      {#if showTransitRoutePanel}
        <div
          class="map-search-chrome__transit-routes"
          id="transit-route-picker"
          aria-label="Transit route picker"
          in:fade={panelFadeIn(reducedMotion.current)}
          out:fade={panelFadeOut(reducedMotion.current)}
        >
          <TransitRoutePanel compact />
        </div>
      {/if}

      {#if showEventsSheet}
        <div
          class="map-search-chrome__events"
          id="persistent-campus-events"
          aria-labelledby="persistent-campus-events-heading"
          in:fade={panelFadeIn(reducedMotion.current)}
          out:fade={panelFadeOut(reducedMotion.current)}
        >
          <EventCards
            headingId="persistent-campus-events-heading"
            showHeading={false}
            showRetract={false}
            oncollapse={closeEventsShelf}
          />
        </div>
      {/if}

      {#if showEditorInline}
        <div
          class="map-search-chrome__editor map-chrome-scroll"
          id="editor-shelf-panel"
          aria-label="Editor tools"
          in:fade={panelFadeIn(reducedMotion.current)}
          out:fade={panelFadeOut(reducedMotion.current)}
        >
          <EditorShelf onclose={closeEditorShelf} />
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
    .campus-browse-chips__container {
        padding: .5rem .75rem;
    }
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

  .search-shell-main {
    min-width: 0;
    max-width: 100%;
  }

  .search-root:not(.mobile-shell) .search-shell-main {
    width: fit-content;
    max-width: 100%;
  }

  .search-root.mobile-shell .search-shell-main {
    display: grid;
    grid-template-columns: var(--map-chrome-toggle-size, 2rem) minmax(0, 1fr);
    align-items: center;
    justify-items: stretch;
    column-gap: 0.375rem;
    row-gap: 0;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    overflow-x: visible;
    padding: calc(env(safe-area-inset-top, 0px) + 0.4375rem)
      max(
        var(--map-search-inline-pad, 0.625rem),
        env(safe-area-inset-right, 0px)
      )
      0.4375rem
      max(
        var(--map-search-inline-pad, 0.625rem),
        env(safe-area-inset-left, 0px)
      );
    background: linear-gradient(
      180deg,
      var(--map-chrome-band-backdrop, hsla(5, 22%, 96%, 0.82)) 0%,
      var(--map-chrome-surface, hsl(5 20% 97%)) 72%
    );
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-radius: var(--map-chrome-radius, 1rem);
    box-shadow:
      0 1px 3px hsla(0, 0%, 0%, 0.12),
      0 4px 12px hsla(0, 0%, 0%, 0.16),
      0 10px 24px hsla(0, 0%, 0%, 0.1);
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
    width: 100%;
    max-width: 100%;
    padding: 0;
  }

  .search-root.mobile-shell .map-search-chrome__bar-row {
    min-width: 0;
  }

  .search-root.mobile-shell .map-search-chrome__pill-wrap {
    min-width: 0;
  }

  .search-root.mobile-shell .map-search-chrome__pill input {
    min-width: 0;
  }

  .search-root.mobile-shell .map-search-chrome__chips {
    grid-column: 1 / -1;
    grid-row: 2;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    margin-inline: 0;
    padding: 0.4375rem 0 0.1875rem;
    border-top: 1px solid var(--map-chrome-divider, hsl(5 12% 88%));
  }

  .search-root.mobile-shell .map-search-chrome__suggestions {
    grid-column: 1 / -1;
    grid-row: 2;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    margin-inline: 0;
    padding: 0;
  }

  .search-root.mobile-shell.search-suggestions-open .map-search-chrome__chips {
    grid-row: 3;
  }

  .search-root.mobile-shell.search-suggestions-open.search-query-active
    .map-search-chrome__transit-routes,
  .search-root.mobile-shell.search-suggestions-open.search-query-active
    .map-search-chrome__events,
  .search-root.mobile-shell.search-suggestions-open.search-query-active
    .map-search-chrome__editor {
    grid-row: 3;
  }

  .search-root.mobile-shell.search-suggestions-open:not(.search-query-active)
    .map-search-chrome__transit-routes,
  .search-root.mobile-shell.search-suggestions-open:not(.search-query-active)
    .map-search-chrome__events,
  .search-root.mobile-shell.search-suggestions-open:not(.search-query-active)
    .map-search-chrome__editor {
    grid-row: 4;
  }

  .search-root.mobile-shell:not(.search-suggestions-open)
    .map-search-chrome__transit-routes,
  .search-root.mobile-shell:not(.search-suggestions-open)
    .map-search-chrome__events,
  .search-root.mobile-shell:not(.search-suggestions-open)
    .map-search-chrome__editor {
    grid-column: 1 / -1;
    grid-row: 3;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    margin-inline: 0;
    padding: 0.375rem 0 0.4375rem;
  }

  .search-root:not(.mobile-shell) .map-search-chrome {
    width: var(--map-search-chrome-width, min(31rem, calc(100vw - 15rem)));
    max-width: 100%;
    min-width: min(22rem, 100%);
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-radius: var(--map-chrome-radius, 1rem);
    background-color: var(--map-chrome-surface, hsl(5 20% 97%));
    box-shadow:
      0 1px 3px hsla(0, 0%, 0%, 0.12),
      0 4px 12px hsla(0, 0%, 0%, 0.16),
      0 10px 24px hsla(0, 0%, 0%, 0.1);
    overflow-x: clip;
    overflow-y: visible;
  }

  .map-search-chrome {
    display: flex;
    flex-direction: column;
    min-width: 0;
    max-width: 100%;
    pointer-events: auto;
  }

  .map-search-chrome__bar {
    padding: 0.4375rem 0.625rem;
  }

  .map-search-chrome__bar-row {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    max-width: 100%;
  }

  .search-root:not(.mobile-shell) .map-search-chrome__bar {
    padding: 0.375rem 0.5rem;
  }

  .map-search-chrome__pill-wrap {
    position: relative;
    flex: 1 1 auto;
    min-width: min(100%, 12rem);
  }

  .map-search-chrome__editor-btn {
    all: unset;
    box-sizing: border-box;
    position: relative;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: 999px;
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    color: hsl(160, 84%, 22%);
    cursor: pointer;
    pointer-events: auto;
    touch-action: manipulation;
  }

  .map-search-chrome__editor-btn:hover,
  .map-search-chrome__editor-btn:focus-visible {
    border-color: hsl(160, 40%, 72%);
    background-color: hsl(160, 45%, 96%);
  }

  .map-search-chrome__editor-btn:focus-visible {
    outline: 2px solid hsl(160, 84%, 22%);
    outline-offset: 1px;
  }

  .map-search-chrome__editor-btn--active {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 96%);
    color: hsl(5, 53%, 22%);
  }

  .map-search-chrome__editor-btn--editing {
    border-color: hsl(160, 84%, 26%);
    background-color: hsl(160, 84%, 26%);
    color: white;
  }

  .map-search-chrome__editor-badge {
    position: absolute;
    top: -0.2rem;
    right: -0.2rem;
    min-width: 1rem;
    height: 1rem;
    padding: 0 0.2rem;
    border-radius: 999px;
    background: hsl(5, 65%, 42%);
    color: white;
    font-size: 0.5625rem;
    font-weight: 700;
    line-height: 1rem;
    text-align: center;
  }

  .map-search-chrome__pill {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    min-height: 2rem;
    padding: 0.25rem 0.5rem;
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

  .map-search-chrome__pill input {
    flex: 1 1 auto;
    min-width: 8.5rem;
    border: none;
    outline: none;
    font-size: 0.875rem;
    color: #18181b;
    background: transparent;
    text-overflow: ellipsis;
  }

  .search-root:not(.mobile-shell) .map-search-chrome__pill input {
    min-width: 15rem;
  }

  .map-search-chrome__pill input::placeholder {
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

  .map-search-chrome__suggestions {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
    border-top: 1px solid var(--map-chrome-divider, hsl(5 12% 88%));
  }

  .search-root.search-suggestions-open:not(.mobile-shell)
    .map-search-chrome__bar,
  .search-root.search-suggestions-open:not(.mobile-shell)
    .map-search-chrome__suggestions {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .search-root.search-suggestions-open:not(.mobile-shell):not(
      .events-panel-open
    ):not(.editor-panel-open):not(.transit-panel-open)
    .map-search-chrome__suggestions {
    border-bottom-left-radius: calc(var(--map-chrome-radius, 1rem) - 1px);
    border-bottom-right-radius: calc(var(--map-chrome-radius, 1rem) - 1px);
  }

  .map-search-chrome__suggestions :global(.suggestions-container) {
    display: flex;
    flex-direction: column;
    border-top: none;
    max-height: min(50dvh, 18rem);
  }

  .map-search-chrome__chips {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.375rem;
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding: 0.3125rem 0.625rem 0.3125rem;
    border-top: 1px solid var(--map-chrome-divider, hsl(5 12% 88%));
    transition: border-radius var(--motion-duration-micro)
      var(--motion-ease-out);
  }

  .map-search-chrome__chips > :global(*) {
    flex-shrink: 0;
    min-width: 0;
  }

  .search-root:not(.mobile-shell) .map-search-chrome__chips {
    border-bottom-left-radius: calc(var(--map-chrome-radius, 1rem) - 1px);
    border-bottom-right-radius: calc(var(--map-chrome-radius, 1rem) - 1px);
  }

  .search-root.editor-panel-open:not(.mobile-shell) .map-search-chrome__chips,
  .search-root.events-panel-open:not(.mobile-shell) .map-search-chrome__chips,
  .search-root.transit-panel-open:not(.mobile-shell) .map-search-chrome__chips {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .map-search-chrome__chips::-webkit-scrollbar {
    display: none;
  }

  .map-search-chrome__chips :global(.building-filter-bar) {
    flex: 0 0 auto;
    min-width: 0;
    padding: 0;
  }

  .map-search-chrome__chips :global(.term-selector) {
    flex: 0 0 auto;
    min-width: 0;
    max-width: min(100%, 18rem);
  }

  .map-search-chrome__chips :global(.transit-filter-chip) {
    flex: 0 0 auto;
    min-width: 0;
  }

  .map-search-chrome__chips :global(.term-filter-chip) {
    flex: 0 0 auto;
    min-width: 0;
  }

  .map-search-chrome__transit-routes {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    padding: 0.3125rem 0.625rem 0.375rem;
    border-top: 1px solid var(--map-chrome-divider, hsl(5 12% 88%));
  }

  .search-root.transit-panel-open:not(.mobile-shell) .map-search-chrome__chips,
  .search-root.transit-panel-open:not(.mobile-shell)
    .map-search-chrome__transit-routes {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .search-root.transit-panel-open:not(.mobile-shell)
    .map-search-chrome__transit-routes {
    border-bottom-left-radius: calc(var(--map-chrome-radius, 1rem) - 1px);
    border-bottom-right-radius: calc(var(--map-chrome-radius, 1rem) - 1px);
  }

  .map-search-chrome__events {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    min-height: 0;
    max-height: min(50dvh, 22rem);
    overflow-x: clip;
    overflow-y: hidden;
    overscroll-behavior: contain;
    border-top: 1px solid var(--map-chrome-divider, hsl(5 12% 88%));
    padding: 0.1875rem 0.625rem 0.4375rem;
    -webkit-overflow-scrolling: touch;
  }

  .search-root.events-panel-open:not(.mobile-shell) .map-search-chrome__events {
    border-bottom-left-radius: calc(var(--map-chrome-radius, 1rem) - 1px);
    border-bottom-right-radius: calc(var(--map-chrome-radius, 1rem) - 1px);
  }

  .map-search-chrome__events :global(.events-section) {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1 1 auto;
    gap: 0;
  }

  .map-search-chrome__events :global(.section-actions--inline) {
    flex: 0 0 auto;
    gap: 0.375rem;
  }

  .map-search-chrome__events :global(.event-list) {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    gap: 0.375rem;
    margin-top: 0.25rem;
    padding-top: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  .map-search-chrome__editor {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    min-height: 0;
    /* Viewport cap below status bar; dvh-only limits ignore search/chip rows. */
    max-height: min(
      24rem,
      calc(
        100dvh - var(--status-bar-block-height, 2.75rem) -
          var(--map-ui-padding, 0.5rem) * 2 - 4.75rem
      )
    );
    overflow-x: clip;
    overflow-y: auto;
    overscroll-behavior: contain;
    border-top: 1px solid var(--map-chrome-divider, hsl(5 12% 88%));
    padding: 0.375rem 0.625rem 0.625rem;
    -webkit-overflow-scrolling: touch;
  }

  .search-root.editor-panel-open:not(.mobile-shell) .map-search-chrome__editor {
    border-bottom-left-radius: calc(var(--map-chrome-radius, 1rem) - 1px);
    border-bottom-right-radius: calc(var(--map-chrome-radius, 1rem) - 1px);
  }

  .map-search-chrome__editor :global(.editor-shelf) {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
</style>
