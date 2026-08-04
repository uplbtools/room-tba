<script lang="ts">
  import Search from "@ui/search/Search.svelte";
  import BottomSheet from "@ui/BottomSheet.svelte";
  import { queryStore, sidePanelStore, jeepneyStore } from "@lib/store.svelte";
  import BuildingResult from "./BuildingResult.svelte";
  import CollegeResult from "./CollegeResult.svelte";
  import DivisionResult from "./DivisionResult.svelte";
  import DormResult from "./DormResult.svelte";
  import OrgResult from "./OrgResult.svelte";
  import PlaceResult from "./PlaceResult.svelte";
  import EventsList from "./EventsList.svelte";
  import EventResult from "./EventResult.svelte";
  import RoomResult from "@ui/room/RoomResult.svelte";
  import ClassQuery from "./ClassQuery.svelte";
  import ClassesList from "./ClassesList.svelte";
  import CampusBrowseList from "./CampusBrowseList.svelte";
  import JeepneyStopPanel from "./JeepneyStopPanel.svelte";
  import JeepneyRouteModal from "@ui/modal/JeepneyRouteModal.svelte";
  import SponsorBanner from "@ui/SponsorBanner.svelte";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { MediaQuery } from "svelte/reactivity";
  import type { BottomSheetSnap } from "@lib/bottom-sheet-snap";

  const mobile = new MediaQuery("max-width:48rem");
  // Entity detail views only — never list/browse panels (docs/ad-policy.md).
  const SPONSOR_CATEGORIES = new Set([
    "building",
    "college",
    "division",
    "room",
    "dorm",
    "organization",
    "place",
    "event",
  ]);
  const showSponsorBanner = $derived(
    queryStore.category !== null &&
      SPONSOR_CATEGORIES.has(queryStore.category) &&
      jeepneyStore.selectedStopIndex === null,
  );
  let lastPanelIdentity = $state<string | null>(null);
  /** Mobile sheet snap — independent of sidePanelStore.collapsed (Map.expand race). */
  let mobileSnap = $state<BottomSheetSnap>("peek");

  const panelIdentity = $derived(
    queryStore.category === null && jeepneyStore.selectedStopIndex === null
      ? null
      : jeepneyStore.selectedStopIndex !== null
        ? `jeepney-stop:${jeepneyStore.selectedStopIndex}`
        : queryStore.category === "event" && queryStore.selectedEventSlug
          ? `event:${queryStore.selectedEventSlug}`
          : `${queryStore.category}:${queryStore.queryValue}`,
  );

  const panelOpen = $derived(
    queryStore.category !== null || jeepneyStore.selectedStopIndex !== null,
  );

  const toggleLabel = $derived(
    sidePanelStore.collapsed
      ? "Expand details panel"
      : "Collapse details panel",
  );

  $effect(() => {
    const identity = panelIdentity;
    if (identity === lastPanelIdentity) return;

    if (identity !== null) {
      // Always open at peek on mobile — ignore Map.expand() full-screen.
      mobileSnap = "peek";
      if (mobile.current) sidePanelStore.collapse();
      else sidePanelStore.expand();
    }
    lastPanelIdentity = identity;
  });

  // Drive map-control visibility in Entry (hide locate/3D/zoom while sheet open).
  $effect(() => {
    if (!mobile.current || !panelOpen) {
      sidePanelStore.setMobileSheetSnap("closed");
      return;
    }
    sidePanelStore.setMobileSheetSnap(mobileSnap);
  });

  function togglePanel() {
    sidePanelStore.collapsed = !sidePanelStore.collapsed;
  }

  function dismissMobileSheet() {
    jeepneyStore.closeStop();
    queryStore.clearQuery();
    mobileSnap = "peek";
    sidePanelStore.setMobileSheetSnap("closed");
  }
</script>

{#snippet panelBody()}
  {#if jeepneyStore.selectedStopIndex !== null}
    <JeepneyStopPanel />
  {:else if jeepneyStore.selectedRouteId !== null && queryStore.category === "browse" && queryStore.queryValue === "jeepney"}
    <JeepneyRouteModal
      routeId={jeepneyStore.selectedRouteId}
      onback={() => jeepneyStore.clearRoute()}
    />
  {:else if queryStore.category === "building"}
    <BuildingResult />
  {:else if queryStore.category === "college"}
    <CollegeResult />
  {:else if queryStore.category === "division"}
    <DivisionResult />
  {:else if queryStore.category === "room"}
    <RoomResult />
  {:else if queryStore.category === "class"}
    <ClassQuery />
  {:else if queryStore.category === "classes"}
    <ClassesList />
  {:else if queryStore.category === "browse"}
    <CampusBrowseList />
  {:else if queryStore.category === "dorm"}
    <DormResult />
  {:else if queryStore.category === "organization"}
    <OrgResult />
  {:else if queryStore.category === "place"}
    <PlaceResult />
  {:else if queryStore.category === "event"}
    <EventResult />
  {:else if queryStore.category === "events"}
    <EventsList />
  {/if}
  {#if showSponsorBanner}
    <SponsorBanner />
  {/if}
{/snippet}

<div class="side-panel-wrapper">
  <Search />
  <div class="side-panel-controls">
    {#if mobile.current}
      <BottomSheet
        open={panelOpen}
        bind:snap={mobileSnap}
        peekRatio={0.48}
        topInset="var(--mobile-detail-sheet-top-inset, 0px)"
        bottomInset="0px"
        onDismiss={dismissMobileSheet}
      >
        {@render panelBody()}
      </BottomSheet>
    {:else if panelOpen}
      <div class="drawer" class:is-collapsed={sidePanelStore.collapsed}>
        <div class="drawer-sheet">
          <button
            class="drawer-handle"
            type="button"
            aria-expanded={!sidePanelStore.collapsed}
            aria-controls="side-panel-details"
            aria-label={toggleLabel}
            title={toggleLabel}
            onclick={togglePanel}
          >
            {#if sidePanelStore.collapsed}
              <ChevronRight size={20} aria-hidden="true" />
            {:else}
              <ChevronLeft size={20} aria-hidden="true" />
            {/if}
          </button>
          <div class="drawer-card">
            <div
              id="side-panel-details"
              class="side-panel-details map-chrome-scroll"
              aria-hidden={sidePanelStore.collapsed}
            >
              {@render panelBody()}
            </div>
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
    overflow: visible;
    pointer-events: none;
  }

  .side-panel-controls {
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
    width: var(--map-search-chrome-width, min(31rem, calc(100vw - 15rem)));
    z-index: var(--z-side-panel, 2);
    pointer-events: none;
    transition: transform var(--motion-duration-panel) var(--motion-ease-out);
  }
  .drawer.is-collapsed {
    transform: translateX(-100%);
  }

  :global(.desktop) .drawer {
    position: absolute;
    top: calc(var(--search-block-height, 3.25rem) + 0.75rem);
    bottom: calc(
      var(--status-bar-block-height, 2.75rem) +
        var(--side-panel-bottom-gap, 0.375rem)
    );
    left: 0;
    height: auto;
  }

  .drawer-card {
    pointer-events: auto;
    height: 100%;
    background-color: var(--map-chrome-panel-bg, hsl(5 18% 96%));
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-left: 3px solid
      var(--map-chrome-panel-accent-border, hsl(5 15% 78%));
    border-radius: 0.8125rem;
    padding: 1.125rem;
    box-shadow: var(--map-chrome-panel-shadow);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  :global(.app-layout.redesign-desktop) .drawer-card {
    border: none;
    border-left: none;
    border-radius: var(--map-chrome-radius, 0.75rem);
    padding: 0.75rem 0.875rem;
    background-color: #fff;
    box-shadow: var(--shadow-results, 0 2px 6px rgb(36 37 46 / 0.2));
  }

  :global(.app-layout.redesign-desktop) .drawer-handle {
    right: -2.25rem;
    width: 2.25rem;
    min-height: 2.25rem;
    height: 3.25rem;
    border: none;
    border-radius: 0 0.625rem 0.625rem 0;
    background-color: #fff;
    color: var(--color-brand, #8d1437);
    box-shadow: var(--shadow-search, 0 1px 3.5px rgb(58 58 71 / 0.2));
  }

  :global(.app-layout.redesign-desktop) .drawer-handle:hover,
  :global(.app-layout.redesign-desktop) .drawer-handle:focus-visible {
    background-color: #fff;
  }

  .drawer-sheet {
    display: contents;
  }

  .side-panel-details {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    overflow-x: clip;
    overflow-clip-margin: 0.5rem;
    overscroll-behavior: contain;
    scroll-padding: 4px 0 0.5rem;
  }
  .side-panel-details > :global(*) {
    flex: 0 1 auto;
    min-height: 0;
    width: 100%;
  }

  .drawer-handle {
    position: absolute;
    top: 50%;
    right: -2.75rem;
    translate: 0 -50%;
    width: 2.75rem;
    min-height: 2.75rem;
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-left: none;
    border-radius: 0 0.75rem 0.75rem 0;
    background-color: var(--map-chrome-surface, hsl(5 20% 97%));
    color: #7b1113;
    cursor: pointer;
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
      margin-inline: var(--map-ui-padding, 0.375rem);
      width: auto;
      max-width: none;
    }

    .side-panel-controls {
      flex: 0 0 auto;
      min-height: 0;
      pointer-events: none;
    }
  }
</style>
