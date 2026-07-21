<script lang="ts">
  import Search from "@ui/search/Search.svelte";
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
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
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
    jeepneyStore.closeStop();
    lastPanelIdentity = identity;
  });

  function togglePanel() {
    sidePanelStore.collapsed = !sidePanelStore.collapsed;
  }

  // ── Mobile sheet drag: finger-follows with snap to peek/open (#411) ──────
  // On pointerdown we capture the start Y and the sheet element. During
  // pointermove we translate the sheet vertically to follow the finger. On
  // release we snap to the nearest position (peek = collapsed, open = expanded)
  // using a CSS transition, with a velocity threshold for flick gestures.

  /** px below the drag threshold is treated as a tap (not a drag). */
  const DRAG_THRESHOLD = 6;
  /** px of drag before the sheet starts following the finger. */
  const DRAG_FOLLOW_THRESHOLD = 4;
  /** Flick velocity (px/ms) above which we snap regardless of position. */
  const FLICK_VELOCITY = 0.5;

  let dragStartY: number | null = null;
  let dragStartTime = 0;
  let dragMoved = false;
  let sheetEl: HTMLElement | null = $state(null);
  /** Live drag offset in px (0 = open, positive = dragged down toward peek). */
  let dragOffset = $state(0);
  const isDragging = $derived(dragStartY !== null && dragMoved);

  function onHandlePointerDown(event: PointerEvent) {
    if (!mobile.current || event.pointerType === "mouse") return;
    dragStartY = event.clientY;
    dragStartTime = performance.now();
    dragMoved = false;
    dragOffset = 0;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  function onHandlePointerMove(event: PointerEvent) {
    if (dragStartY === null) return;
    const delta = event.clientY - dragStartY;
    if (Math.abs(delta) > DRAG_THRESHOLD) dragMoved = true;
    if (!dragMoved) return;

    // When expanded, dragging down increases offset (toward peek).
    // When collapsed, dragging up decreases offset (toward open).
    if (sidePanelStore.collapsed) {
      dragOffset = Math.min(0, delta); // negative = opening
    } else {
      dragOffset = Math.max(0, delta); // positive = closing
    }
  }

  function onHandlePointerUp(event: PointerEvent) {
    if (dragStartY === null) return;
    const elapsed = performance.now() - dragStartTime;
    const delta = event.clientY - dragStartY;
    const velocity = Math.abs(delta) / Math.max(elapsed, 1);

    dragStartY = null;

    if (!dragMoved) {
      // Tap — let the click handler toggle.
      return;
    }

    // Flick: snap based on velocity direction regardless of distance.
    if (velocity > FLICK_VELOCITY) {
      if (delta > 0) sidePanelStore.collapse();
      else sidePanelStore.expand();
    } else if (sidePanelStore.collapsed) {
      // Collapsed: negative delta means dragged up → expand.
      if (delta < -DRAG_FOLLOW_THRESHOLD) sidePanelStore.expand();
    } else {
      // Expanded: positive delta means dragged down → collapse.
      if (delta > DRAG_FOLLOW_THRESHOLD) sidePanelStore.collapse();
    }

    dragMoved = false;
    dragOffset = 0;
  }

  function onHandleClick() {
    // Swallow the click that fires after a drag so it doesn't re-toggle.
    if (dragMoved) {
      dragMoved = false;
      return;
    }
    togglePanel();
  }

  // CSS transform for the sheet during drag — follows the finger.
  const sheetTransform = $derived(
    isDragging && dragOffset !== 0
      ? `translateY(${dragOffset}px)`
      : "none",
  );
  // Disable transition during active drag so the sheet follows the finger
  // instantly. Empty string lets the CSS transition apply for snap animation.
  const sheetTransition = $derived(isDragging ? "none" : "");

</script>

<div class="side-panel-wrapper">
  <Search />
  <div class="side-panel-controls">
    {#if (queryStore.category !== null || jeepneyStore.selectedStopIndex !== null) && !(mobile.current && sidePanelStore.collapsed)}
      <div class="drawer" class:is-collapsed={sidePanelStore.collapsed}>
        <div
          class="drawer-sheet"
          bind:this={sheetEl}
          style:transform={sheetTransform}
          style:transition={sheetTransition}
        >
          <button
            class="drawer-handle"
            type="button"
            aria-expanded={!sidePanelStore.collapsed}
            aria-controls="side-panel-details"
            aria-label={toggleLabel}
            title={toggleLabel}
            onclick={onHandleClick}
            onpointerdown={onHandlePointerDown}
            onpointermove={onHandlePointerMove}
            onpointerup={onHandlePointerUp}
          >
            {#if mobile.current}
              <span class="drawer-grab" aria-hidden="true"></span>
            {:else if sidePanelStore.collapsed}
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

  /* Desktop: pin the drawer to the flex space between search and status bar —
     collapsed too, so the retracted sliver doesn't reach up behind the search
     bar.
     #716: was @media (min-width: 48.0625rem), now gated by .desktop class */
  :global(.desktop) .drawer {
    position: absolute;
    top: calc(var(--search-block-height, 3.25rem) + 0.75rem);
    bottom: calc(var(--status-bar-block-height, 2.75rem) + var(--side-panel-bottom-gap, 0.375rem));
    left: 0;
    height: auto;
  }

  .drawer-card {
    pointer-events: auto;
    height: 100%;
    background-color: var(--map-chrome-panel-bg, hsl(5 18% 96%));
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-left: 3px solid var(--map-chrome-panel-accent-border, hsl(5 15% 78%));
    border-radius: 0.8125rem;
    padding: 1.125rem;
    box-shadow: var(--map-chrome-panel-shadow);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .drawer-sheet {
    display: contents;
  }

  .side-panel-details {
    display: flex;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    /* #411: allow action chips and focus rings to extend horizontally
       without being clipped by the vertical scroll container. */
    overflow-x: visible;
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
      position: relative;
      gap: 0;
      margin-inline: var(--map-ui-padding, 0.375rem);
      width: auto;
      max-width: none;
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
      top: var(--mobile-detail-sheet-top-inset);
      right: var(--map-ui-padding, 0.375rem);
      left: var(--map-ui-padding, 0.375rem);
      bottom: var(--side-panel-bottom-inset);
      width: auto;
      height: auto;
      max-height: none;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: stretch;
      pointer-events: none;
      transform: none;
      transition: none;
    }

    .drawer-sheet {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      max-height: 100%;
      pointer-events: auto;
      background-color: var(--map-chrome-panel-bg, hsl(5 18% 96%));
      border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
      border-bottom: none;
      border-radius: var(--map-chrome-radius, 1rem);
      box-shadow: var(--map-chrome-panel-shadow);
      overflow: hidden;
      /* #411: snap transition for drag-release — transform animates back
         to translateY(0) when the sheet settles at peek or open. */
      transition: transform 0.3s var(--motion-ease-out, cubic-bezier(0.22, 1, 0.36, 1));
    }

    .drawer.is-collapsed {
      top: auto;
      height: auto;
      transform: none;
    }

    .drawer.is-collapsed .drawer-sheet {
      flex: 0 0 auto;
      border-radius: var(--map-chrome-radius, 1rem);
      border-bottom: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    }

    .drawer.is-collapsed .drawer-card {
      flex: 0 0 0;
      max-height: 0;
      min-height: 0;
      opacity: 0;
      padding-top: 0;
      padding-bottom: 0;
      border-width: 0;
      overflow: hidden;
      pointer-events: none;
    }

    .drawer-card {
      flex: 1 1 0;
      min-height: 0;
      height: auto;
      max-height: none;
      pointer-events: auto;
      border: none;
      border-left: none;
      border-radius: 0;
      box-shadow: none;
      padding: 0
        max(
          var(--map-search-inline-pad, 0.625rem),
          env(safe-area-inset-right, 0px)
        )
        1rem
        max(
          var(--map-search-inline-pad, 0.625rem),
          env(safe-area-inset-left, 0px)
        );
      background: transparent;
      transition:
        max-height var(--motion-duration-panel) var(--motion-ease-out),
        opacity var(--motion-duration-micro) var(--motion-ease-out),
        padding var(--motion-duration-panel) var(--motion-ease-out);
      opacity: 1;
    }

    .drawer-handle {
      position: relative;
      top: auto;
      right: auto;
      left: auto;
      translate: none;
      flex-shrink: 0;
      align-self: stretch;
      width: auto;
      height: auto;
      /* #411: slim handle — was 2.75rem, now a lightweight grab zone */
      min-height: 1.5rem;
      padding: 0.375rem
        max(
          var(--map-search-inline-pad, 0.625rem),
          env(safe-area-inset-right, 0px)
        )
        0.375rem
        max(
          var(--map-search-inline-pad, 0.625rem),
          env(safe-area-inset-left, 0px)
        );
      pointer-events: auto;
      border: none;
      border-radius: 0;
      box-shadow: none;
      background: transparent;
      color: #7b1113;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      /* Let the handle own vertical drags instead of scrolling the page. */
      touch-action: none;
    }

    .drawer-grab {
      display: block;
      width: 2.5rem;
      height: 0.1875rem;
      border-radius: 999px;
      background: #d4d4d8;
      flex-shrink: 0;
    }

    .drawer-handle:hover .drawer-grab,
    .drawer-handle:focus-visible .drawer-grab {
      background: #a1a1aa;
    }

    /* #411: active drag state — pill darkens to show the sheet is being dragged */
    .drawer-handle:active .drawer-grab {
      background: #71717a;
      width: 3rem;
    }

    .side-panel-details {
      scroll-padding-bottom: 0.5rem;
    }

    /* #411: remove seam between handle and card content — the card's top
       padding was creating a visible gap. Handle zone and card share the
       same background via .drawer-sheet, so no border needed here. */
    .drawer-card {
      padding-top: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .drawer,
    .drawer-card,
    .drawer-sheet {
      transition: none;
    }
  }
</style>
