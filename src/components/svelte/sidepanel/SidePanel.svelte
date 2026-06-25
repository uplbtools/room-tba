<script lang="ts">
  import Search from "../search/Search.svelte";
  import { queryStore, sidePanelStore } from "../../../lib/store.svelte";
  import type { QueryStoreState } from "../../../lib/store.svelte";
  import BuildingResult from "./BuildingResult.svelte";
  import CollegeResult from "./CollegeResult.svelte";
  import DivisionResult from "./DivisionResult.svelte";
  import DormResult from "./DormResult.svelte";
  import RoomResult from "../room/RoomResult.svelte";
  import ClassQuery from "./ClassQuery.svelte";
  import LocationButton from "../LocationButton.svelte";
  import JeepneyMenu from "../JeepneyMenu.svelte";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { cubicOut } from "svelte/easing";
  import { MediaQuery } from "svelte/reactivity";
  import { fly } from "svelte/transition";

  type ResultCategory = Exclude<QueryStoreState["category"], null>;

  const categoryLabels: Record<ResultCategory, string> = {
    building: "Building",
    college: "College",
    division: "Division",
    room: "Room",
    class: "Class search",
    dorm: "Dorm",
  };

  const mobile = new MediaQuery("max-width:48rem");
  let lastPanelIdentity = $state<string | null>(null);
  const panelIdentity = $derived(
    queryStore.category === null
      ? null
      : `${queryStore.category}:${queryStore.queryValue}`,
  );
  const summaryLabel = $derived.by(() => {
    const category = queryStore.category;
    return category === null ? "" : categoryLabels[category];
  });
  const summaryValue = $derived(queryStore.queryValue || queryStore.inputValue);
  const toggleLabel = $derived(
    sidePanelStore.collapsed
      ? "Expand details panel"
      : "Collapse details panel",
  );

  $effect(() => {
    const identity = panelIdentity;
    if (identity === lastPanelIdentity) return;

    sidePanelStore.expand();
    lastPanelIdentity = identity;
  });

  function togglePanel() {
    sidePanelStore.collapsed = !sidePanelStore.collapsed;
  }
</script>

<div class="side-panel-wrapper">
  <Search />
  <div
    class="side-panel-controls"
    class:is-collapsed={sidePanelStore.collapsed}
  >
    <div class="floating-actions">
      <JeepneyMenu />
      <LocationButton />
    </div>
    {#if queryStore.category !== null}
      <div
        class="side-panel-content"
        class:is-collapsed={sidePanelStore.collapsed}
        in:fly={{ x: -12, duration: 160, easing: cubicOut }}
        out:fly={{ x: -12, duration: 120 }}
      >
        <div class="side-panel-summary">
          <div class="summary-copy">
            <span class="summary-label">{summaryLabel}</span>
            <span class="summary-title">{summaryValue}</span>
          </div>
          <button
            class="panel-toggle"
            type="button"
            aria-expanded={!sidePanelStore.collapsed}
            aria-controls="side-panel-details"
            aria-label={toggleLabel}
            on:click={togglePanel}
          >
            {#if sidePanelStore.collapsed}
              <ChevronRight size={18} />
              <span>Expand</span>
            {:else}
              {#if mobile.current}
                <ChevronDown size={18} />
              {:else}
                <ChevronLeft size={18} />
              {/if}
              <span>Collapse</span>
            {/if}
          </button>
        </div>
        <div
          id="side-panel-details"
          class="side-panel-details"
          hidden={sidePanelStore.collapsed}
        >
          {#if queryStore.category === "building"}
            <BuildingResult />
          {:else if queryStore.category === "college"}
            <CollegeResult />
          {:else if queryStore.category === "division"}
            <DivisionResult />
          {:else if queryStore.category === "room"}
            <RoomResult />
          {:else if queryStore.category === "class"}
            <ClassQuery />
          {:else if queryStore.category === "dorm"}
            <DormResult />
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .side-panel-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.75rem;
    flex: 1;
    pointer-events: none;
  }
  .side-panel-content {
    background-color: white;
    border-radius: 0.8125rem; /* 24px */
    padding: 1.125rem; /* 18px top/bottom, 24px left/right */
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    flex: 0 0 min(25.75rem, calc(50% - 4rem));
    box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.25);
    overflow: hidden;
    animation: panel-settle-in 160ms cubic-bezier(0.22, 1, 0.36, 1);
    &.is-collapsed {
      position: absolute;
      top: 50%;
      left: -0.5rem;
      z-index: 2;
      translate: 0 -50%;
      width: min(9.75rem, calc(100vw - 1rem));
      height: auto;
      flex: none;
      padding: 0.5rem 0.75rem 0.5rem 0.625rem;
      border-radius: 0 999px 999px 0;
      animation: tab-peek-left 180ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    .side-panel-details > :global(*) {
      scrollbar-width: thin;
      scrollbar-color: hsl(6, 63%, 48%) hsl(0, 0%, 98%);
    }
  }
  .side-panel-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    min-width: 0;
    flex-shrink: 0;
  }
  .side-panel-content:not(.is-collapsed) .side-panel-summary {
    justify-content: flex-end;
    margin-bottom: -0.25rem;
  }
  .side-panel-content:not(.is-collapsed) .summary-copy {
    display: none;
  }
  .summary-copy {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }
  .summary-label {
    color: #7b1113;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    line-height: 1;
    text-transform: uppercase;
  }
  .summary-title {
    color: black;
    font-size: 0.9375rem;
    font-weight: 700;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .panel-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    flex: 0 0 auto;
    border: 1px solid #d8b9ba;
    border-radius: 999px;
    background-color: white;
    color: #7b1113;
    cursor: pointer;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.375rem 0.625rem;
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }
  .panel-toggle:hover,
  .panel-toggle:focus-visible {
    background-color: #fdf3f3;
    border-color: #c58f91;
  }
  .panel-toggle:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }
  .side-panel-details {
    display: flex;
    flex: 1 1 0;
    min-height: 0;
  }
  .side-panel-details[hidden] {
    display: none;
  }
  .side-panel-controls {
    display: flex;
    /* flex-direction: column; */
    flex: 1;
    align-items: flex-end;
    flex-direction: row-reverse;
    justify-content: space-between;
    gap: 1rem;
  }
  .side-panel-controls.is-collapsed {
    align-items: flex-end;
  }
  .floating-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    pointer-events: none;
  }
  .side-panel-content.is-collapsed .side-panel-summary {
    gap: 0.5rem;
  }
  .side-panel-content.is-collapsed .summary-label {
    font-size: 0.625rem;
  }
  .side-panel-content.is-collapsed .summary-title {
    font-size: 0.8125rem;
  }
  .side-panel-content.is-collapsed .panel-toggle {
    width: 1.875rem;
    height: 1.875rem;
    justify-content: center;
    padding: 0;
  }
  .side-panel-content.is-collapsed .panel-toggle span {
    display: none;
  }
  @keyframes panel-settle-in {
    from {
      opacity: 0.92;
      transform: translateX(-0.5rem) scale(0.99);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
  @keyframes tab-peek-left {
    from {
      opacity: 0.9;
      transform: translateX(-1rem) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
  /* Mobile responsiveness for side panel */
  @media screen and (max-width: 48rem) {
    .side-panel-wrapper {
      position: relative;
      margin: 0;
      width: 100%;
      max-width: 100%;
      flex: 1;
      pointer-events: none; /* Let clicks pass through empty space */
      display: flex;
      flex-direction: column;
      justify-content: space-between; /* Space between search top and panel bottom */
    }
    .side-panel-controls {
      flex-direction: column;
      justify-content: flex-end;
      /* align-items: flex-end; */
    }

    .side-panel-content {
      width: 100%;
      flex: 0 0 50%;
    }
    .side-panel-content.is-collapsed {
      top: 50%;
      bottom: auto;
      left: -0.5rem;
      translate: 0 -50%;
      width: min(9.75rem, calc(100vw - 1rem));
      max-height: 5.5rem;
      flex: none;
      padding: 0.5rem 0.75rem 0.5rem 0.625rem;
      border-radius: 0 999px 999px 0;
      animation: tab-peek-left 180ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    /* .side-panel-content {
      flex: none;
      margin-top: auto;
      max-height: 45vh;
      box-shadow: 0px -4px 12px rgba(0, 0, 0, 0.1);
    } */
  }

  @media (prefers-reduced-motion: reduce) {
    .side-panel-content,
    .side-panel-content.is-collapsed {
      animation: none;
    }

    .panel-toggle {
      transition: none;
    }
  }
</style>
