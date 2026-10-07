<script lang="ts">
  import BottomSheet from "@ui/BottomSheet.svelte";
  import DirectionsPanel from "@ui/directions/DirectionsPanel.svelte";
  import {
    queryStore,
    sidePanelStore,
    jeepneyStore,
    directionsStore,
  } from "@lib/store.svelte";
  import JeepneyStopPanel from "./JeepneyStopPanel.svelte";
  import JeepneyRouteModal from "@ui/modal/JeepneyRouteModal.svelte";
  import SponsorBanner from "@ui/SponsorBanner.svelte";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { MediaQuery } from "svelte/reactivity";
  import { resolvePanelContent } from "@lib/side-panel-content";
  import type { BottomSheetSnap } from "@lib/bottom-sheet-snap";

  const mobile = new MediaQuery("max-width:48rem");
  // Entity detail views only, never list/browse panels (docs/ad-policy.md).
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
      jeepneyStore.selectedStopIndex === null &&
      // Directions is a task view, not an entity detail view (docs/ad-policy.md).
      !directionsStore.active,
  );
  let lastPanelIdentity = $state<string | null>(null);
  let detailsEl = $state<HTMLElement | null>(null);
  /** Mobile sheet snap, independent of sidePanelStore.collapsed (Map.expand race). */
  let mobileSnap = $state<BottomSheetSnap>("peek");

  /** Navigation is a map-first view: the bar takes a strip, the map the rest. */
  const navPeek = $derived(directionsStore.navigating);
  /** Planning mode: thin summary strip so map + top search stay in view. */
  const directionsPeek = $derived(
    directionsStore.active && !directionsStore.navigating,
  );
  /**
   * Browse lists (colleges, orgs, classes) carry a title, a filter and a count
   * above the rows, so the entity peek left room for about two rows. They
   * open taller; the filtered pins above stay in view.
   */
  const listPeek = $derived(
    !directionsStore.active &&
      jeepneyStore.selectedStopIndex === null &&
      (queryStore.category === "classes" ||
        (queryStore.category === "browse" &&
          queryStore.queryValue !== "jeepney")),
  );
  // Directions peek must clear the first option + Show on map / Start;
  // 0.3 only showed the Walk card.
  const sheetPeekRatio = $derived(
    navPeek ? 0.22 : directionsPeek ? 0.44 : listPeek ? 0.68 : 0.48,
  );

  // Entering follow mode from an expanded sheet would otherwise leave the map
  // hidden behind the very panel that is meant to be guiding it.
  $effect(() => {
    if (directionsStore.navigating) mobileSnap = "peek";
  });

  // Opening Get Directions starts at peek so the map + search stay usable;
  // users expand via the sheet handle for the full option list.
  let directionsWasActive = false;
  $effect(() => {
    const active = directionsStore.active;
    if (active && !directionsWasActive) {
      mobileSnap = "peek";
      if (mobile.current) sidePanelStore.collapse();
    }
    directionsWasActive = active;
  });

  const panelIdentity = $derived(
    queryStore.category === null && jeepneyStore.selectedStopIndex === null
      ? null
      : jeepneyStore.selectedStopIndex !== null
        ? `jeepney-stop:${jeepneyStore.selectedStopIndex}`
        : queryStore.category === "event" && queryStore.selectedEventSlug
          ? `event:${queryStore.selectedEventSlug}`
          : `${queryStore.category}:${queryStore.queryValue}`,
  );

  /**
   * What the panel renders. `openPanel()` metadata wins, but it cannot be the
   * only gate: deep links and back/forward only set a query, so the panel has to
   * resolve from the category too or those paths render an empty map.
   */
  const PanelContent = $derived(
    resolvePanelContent(sidePanelStore.state, queryStore.category),
  );

  /** Browse lists (colleges, orgs, classes, events) are a destination picked
      from the menu, not entity details: their sheet stops above the bottom
      nav (and the FAB overhanging it) so the tabs and menu stay reachable. */
  const browseSheet = $derived(
    !directionsStore.active &&
      jeepneyStore.selectedStopIndex === null &&
      (queryStore.category === "browse" ||
        queryStore.category === "classes" ||
        queryStore.category === "events"),
  );

  const panelOpen = $derived(
    PanelContent !== null ||
      jeepneyStore.selectedStopIndex !== null ||
      directionsStore.active,
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
      // Navigating to another entity drops the metadata the previous view was
      // opened with, so a still-open review queue cannot outlive the query that
      // replaced it.
      sidePanelStore.state = null;
      // A new entity starts at its own header, not the previous scroll offset.
      if (detailsEl) detailsEl.scrollTop = 0;
      // Always open at peek on mobile, ignoring Map.expand() full-screen.
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

  /** Exit a focused jeepney route: no route line, no stops, plain map. */
  function closeJeepneyRoute() {
    jeepneyStore.disableLayer();
    queryStore.clearQuery();
    sidePanelStore.closePanel();
  }

  function dismissMobileSheet() {
    directionsStore.close();
    // Swiping the sheet away must not strand a drawn route with no panel.
    jeepneyStore.clearRoute();
    queryStore.clearQuery();
    sidePanelStore.closePanel();
    mobileSnap = "peek";
    sidePanelStore.setMobileSheetSnap("closed");
  }
</script>

{#snippet panelBody()}
  {#if directionsStore.active}
    <DirectionsPanel />
  {:else if jeepneyStore.selectedStopIndex !== null}
    <JeepneyStopPanel />
  {:else if jeepneyStore.selectedRouteId !== null && queryStore.category === "browse" && queryStore.queryValue === "jeepney"}
    <JeepneyRouteModal
      routeId={jeepneyStore.selectedRouteId}
      onback={() => jeepneyStore.clearRoute()}
      onclose={closeJeepneyRoute}
    />
  {:else if PanelContent}
    <PanelContent />
  {/if}
  {#if showSponsorBanner}
    <SponsorBanner />
  {/if}
{/snippet}

{#if mobile.current}
  <BottomSheet
    open={panelOpen}
    bind:snap={mobileSnap}
    peekRatio={sheetPeekRatio}
    peekFitTo={navPeek || directionsPeek
      ? undefined
      : ".entity-actions, .sk-detail__actions"}
    topInset="var(--mobile-detail-sheet-top-inset, 0px)"
    bottomInset={browseSheet
      ? "calc(var(--mobile-bottom-nav-height, 4.5rem) + 0.25rem)"
      : "0px"}
    scrollResetKey={panelIdentity}
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
          bind:this={detailsEl}
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

<style>
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

  /* Desktop: pin the drawer to the flex space between search and status bar,
     collapsed too, so the retracted sliver does not reach up behind the search
     bar.
     #716: was @media (min-width: 48.0625rem), now gated by .desktop class */
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
    /* Backdrop for the sticky place-sheet header (entity-detail.css). */
    --entity-sheet-bg: var(--map-chrome-panel-bg, hsl(5 18% 96%));
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
    --entity-sheet-bg: #fff;
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
    /* Wrap so a trailing full-width child (sponsor banner) lands on its own
       row below the entity content instead of a side column. */
    flex-wrap: wrap;
    align-content: flex-start;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    /* #411: `overflow-x: visible` here is a no-op, per spec pairing `visible`
       on one axis with a non-`visible` value on the other resolves the
       `visible` axis to `auto`, so it would still clip/scroll like the y-axis.
       `clip` avoids that pairing rule entirely (it is not `visible`), and
       `overflow-clip-margin` gives chips/focus rings room to bleed past the
       padding box without triggering a scrollbar. */
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

  @media (prefers-reduced-motion: reduce) {
    .drawer,
    .drawer-card,
    .drawer-sheet {
      transition: none;
    }
  }
</style>
