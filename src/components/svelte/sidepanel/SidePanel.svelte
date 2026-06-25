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
  import BuildingTypeControl from "../BuildingTypeControl.svelte";
  import LocationButton from "../LocationButton.svelte";
  import MapLegend from "../MapLegend.svelte";
  import JeepneyMenu from "../JeepneyMenu.svelte";
  import TerrainControl from "../TerrainControl.svelte";
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
      : `${queryStore.category}:${queryStore.queryValue}`,
  );
  const toggleLabel = $derived(
    sidePanelStore.collapsed
      ? "Expand details panel"
      : "Collapse details panel",
  );

  // A new result always re-opens the drawer.
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
    <div class="floating-actions">
      <MapLegend />
      <BuildingTypeControl />
      <TerrainControl />
      <JeepneyMenu />
      <LocationButton />
    </div>
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
    justify-content: space-between;
    gap: 0.75rem;
    flex: 1;
    min-height: 0;
    pointer-events: none;
  }

  .side-panel-controls {
    position: relative;
    display: flex;
    flex: 1;
    align-items: flex-end;
    flex-direction: row-reverse;
    justify-content: space-between;
    gap: 1rem;
    min-height: 0;
  }

  .floating-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    pointer-events: none;
  }

  /* Full-height drawer that slides out of view when retracted, leaving a
     persistent middle handle on its outer edge to pull it back. */
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

  /* Mobile: drawer becomes a bottom sheet that slides down to retract. */
  @media screen and (max-width: 48rem) {
    .side-panel-wrapper {
      position: relative;
      margin: 0;
      width: 100%;
      max-width: 100%;
      flex: 1;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .side-panel-controls {
      flex-direction: column;
      justify-content: flex-end;
    }
    .floating-actions {
      position: absolute;
      right: 0;
      bottom: calc(50% + 1.5rem);
    }
    .drawer {
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 50%;
    }
    .drawer.is-collapsed {
      transform: translateY(100%);
    }
    .drawer-handle {
      top: -1.75rem;
      right: auto;
      left: 50%;
      translate: -50% 0;
      width: 5.5rem;
      height: 1.75rem;
      border-radius: 0.875rem 0.875rem 0 0;
      box-shadow: 0 -3px 8px 0 rgba(0, 0, 0, 0.22);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .drawer {
      transition: none;
    }
  }
</style>
