<script lang="ts">
  import Search from "../search/Search.svelte";
  import { queryStore, sidePanelStore } from "../../../lib/store.svelte";
  import BuildingResult from "./BuildingResult.svelte";
  import CollegeResult from "./CollegeResult.svelte";
  import DivisionResult from "./DivisionResult.svelte";
  import DormResult from "./DormResult.svelte";
  import EventsList from "./EventsList.svelte";
  import EventResult from "./EventResult.svelte";
  import RoomResult from "../room/RoomResult.svelte";
  import ClassQuery from "./ClassQuery.svelte";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import { MediaQuery } from "svelte/reactivity";

  const mobile = new MediaQuery("max-width:48rem");
  let lastPanelIdentity = $state<string | null>(null);
  const panelIdentity = $derived(
    queryStore.category === null
      ? null
      : queryStore.category === "event" && queryStore.selectedEventSlug
        ? `event:${queryStore.selectedEventSlug}`
        : `${queryStore.category}:${queryStore.queryValue}`,
  );
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
  <div class="side-panel-controls">
    {#if queryStore.category !== null}
      <div class="drawer" class:is-collapsed={sidePanelStore.collapsed}>
        <button
          class="drawer-handle"
          type="button"
          aria-expanded={!sidePanelStore.collapsed}
          aria-controls="side-panel-details"
          aria-label={toggleLabel}
          title={toggleLabel}
          onclick={togglePanel}
        >
          {#if mobile.current}
            {#if sidePanelStore.collapsed}
              <ChevronUp size={20} />
            {:else}
              <ChevronDown size={20} />
            {/if}
          {:else if sidePanelStore.collapsed}
            <ChevronRight size={20} />
          {:else}
            <ChevronLeft size={20} />
          {/if}
        </button>
        <div class="drawer-card">
          <div
            id="side-panel-details"
            class="side-panel-details"
            aria-hidden={sidePanelStore.collapsed}
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
            {:else if queryStore.category === "event"}
              <EventResult />
            {:else if queryStore.category === "events"}
              <EventsList />
            {/if}
          </div>
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
    gap: 0.75rem;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .side-panel-controls {
    position: relative;
    display: flex;
    flex: 1;
    align-items: flex-end;
    min-height: 0;
  }

  .drawer {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: min(25.75rem, calc(50% - 4rem));
    z-index: 2;
    pointer-events: none;
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .drawer.is-collapsed {
    transform: translateX(-100%);
  }

  .drawer-card {
    pointer-events: auto;
    height: 100%;
    background-color: white;
    border-radius: 0.8125rem;
    padding: 1.125rem;
    box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.25);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .side-panel-details {
    display: flex;
    flex: 1 1 0;
    min-height: 0;
  }
  .side-panel-details > :global(*) {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: hsl(6, 63%, 48%) hsl(0, 0%, 98%);
  }

  .drawer-handle {
    position: absolute;
    top: 50%;
    right: -1.875rem;
    translate: 0 -50%;
    width: 1.875rem;
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    border: none;
    border-radius: 0 0.75rem 0.75rem 0;
    background-color: white;
    color: #7b1113;
    cursor: pointer;
    box-shadow: 2px 0 4px 0 rgba(0, 0, 0, 0.2);
  }
  .drawer-handle:hover,
  .drawer-handle:focus-visible {
    background-color: #fdf3f3;
  }
  .drawer-handle:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }

  @media screen and (max-width: 48rem) {
    .side-panel-wrapper {
      gap: 0;
    }

    .side-panel-wrapper {
      position: relative;
      margin: 0;
      width: 100%;
      max-width: 100%;
      flex: 1;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      min-height: 0;
      overflow: visible;
    }

    .side-panel-controls {
      flex: 0 0 auto;
      min-height: 0;
      pointer-events: none;
    }

    .drawer {
      position: fixed;
      z-index: 12;
      top: var(--mobile-detail-sheet-top-inset);
      right: 0;
      bottom: calc(
        var(--status-bar-block-height) + env(safe-area-inset-bottom, 0px)
      );
      left: 0;
      width: auto;
      height: auto;
      max-height: none;
      display: flex;
      flex-direction: column;
      pointer-events: auto;
      transform: none;
    }

    .drawer.is-collapsed {
      top: auto;
      height: auto;
    }

    .drawer.is-collapsed .drawer-card {
      display: none;
    }

    .drawer-card {
      flex: 1 1 auto;
      min-height: 0;
      border-radius: 0 0 var(--map-chrome-radius, 1rem)
        var(--map-chrome-radius, 1rem);
      box-shadow: var(
        --map-chrome-panel-shadow,
        0 0 0 1px hsla(0, 0%, 0%, 0.14),
        0 4px 14px hsla(0, 0%, 0%, 0.2),
        0 10px 28px hsla(0, 0%, 0%, 0.12)
      );
    }

    .drawer-handle {
      position: relative;
      top: auto;
      right: auto;
      left: auto;
      translate: none;
      flex-shrink: 0;
      align-self: center;
      width: 5.5rem;
      height: var(--drawer-peek-offset, 1.75rem);
      border-radius: var(--map-chrome-radius, 1rem)
        var(--map-chrome-radius, 1rem) 0 0;
      box-shadow: 0 -3px 8px 0 rgba(0, 0, 0, 0.22);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .drawer {
      transition: none;
    }
  }
</style>
