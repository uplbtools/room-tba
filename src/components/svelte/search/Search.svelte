<script lang="ts">
  import { throttle } from "es-toolkit";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import SearchIcon from "@lucide/svelte/icons/search";
  import { tick } from "svelte";
  import { queryStore } from "../../../lib/store.svelte";
  import Suggestions from "./Suggestions.svelte";

  let searchElement = $state<HTMLInputElement | null>(null);
  let typing = $state(false);
  let searchCollapsed = $state(false);
  let searchFocused = $state(false);

  const throttleSearch = throttle((searchInput: string) => {
    queryStore.inputValue = searchInput;
    queryStore.setType("query");
  }, 1500);

  function handleInput(
    event: Event & { currentTarget: EventTarget & HTMLInputElement },
  ) {
    throttleSearch(event.currentTarget.value);
  }

  function closeSearchContext() {
    queryStore.clearQuery();
    searchElement?.focus();
  }

  async function expandSearch() {
    searchCollapsed = false;
    await tick();
    searchElement?.focus();
  }

  function collapseSearch() {
    if (searchFocused) return;
    searchCollapsed = true;
  }

  function handleFocusOut(event: FocusEvent) {
    const currentTarget = event.currentTarget as HTMLElement;
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !currentTarget.contains(nextTarget)) {
      searchFocused = false;
    }
  }
</script>

<div
  class="search-filter-container"
  class:search-focused={queryStore.type !== "result"}
  class:is-collapsed={searchCollapsed}
>
  {#if searchCollapsed}
    <button
      type="button"
      class="search-tab"
      aria-expanded="false"
      aria-controls="search-panel"
      aria-label="Expand search bar"
      onclick={expandSearch}
    >
      <SearchIcon size={18} />
      <span>Search</span>
    </button>
  {/if}

  <div
    id="search-panel"
    class="search-panel"
    hidden={searchCollapsed}
    onfocusin={() => (searchFocused = true)}
    onfocusout={handleFocusOut}
  >
    <div class="search-filter">
      <div class="search-container">
        <SearchIcon class="search-icon" size={20} />
        <input
          type="text"
          id="search"
          autocomplete="off"
          value={queryStore.inputValue}
          bind:this={searchElement}
          class={typing ? "typing" : ""}
          oninput={handleInput}
          placeholder="Search room, building, dorm, division..."
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
        {#if queryStore.inputValue !== ""}
          <button
            onclick={closeSearchContext}
            type="button"
            class="clear-btn"
            aria-label="Clear Search"
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
        {#if !searchFocused}
          <button
            type="button"
            class="collapse-search-btn"
            aria-expanded="true"
            aria-controls="search-panel"
            aria-label="Collapse search bar"
            onclick={collapseSearch}
          >
            <ChevronLeft size={18} />
          </button>
        {/if}
      </div>
    </div>
    <Suggestions />
  </div>
</div>

<style>
  .search-filter-container {
    position: relative;
    width: min(25.75rem, calc(50% - 4rem));
    pointer-events: auto;
  }

  .search-filter-container.is-collapsed {
    width: max-content;
  }

  .search-focused .search-panel:focus-within :global(.suggestions-container) {
    opacity: 1;
    pointer-events: auto;
  }

  .search-panel[hidden] {
    display: none;
  }

  .search-tab {
    display: inline-flex;
    min-height: 2.75rem;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid #d8b9ba;
    border-radius: 0 999px 999px 0;
    background-color: white;
    color: #7b1113;
    cursor: pointer;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 800;
    padding: 0.625rem 0.875rem 0.625rem 0.75rem;
    box-shadow: 0rem 2px 0.25rem 0rem rgba(0, 0, 0, 0.25);
  }

  .search-tab:hover,
  .search-tab:focus-visible {
    background-color: #fdf3f3;
  }

  .search-filter {
    background-color: white;
    border-radius: 0.8125rem;
    box-shadow: 0rem 2px 0.25rem 0rem rgba(0, 0, 0, 0.25);
    display: flex;
    align-items: center;
    padding: 0.875rem 1rem;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  @media screen and (max-width: 48rem) {
    .search-filter {
      pointer-events: auto;
      border-radius: 2rem; /* Pill shape for mobile */
    }
    .search-filter-container {
      width: 100%;
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

  .clear-btn,
  .filter-btn,
  .collapse-search-btn {
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
  .filter-btn:hover,
  .collapse-search-btn:hover {
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
