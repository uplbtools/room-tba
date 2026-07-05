<script lang="ts">
  import Search from "@ui/search/Search.svelte";
  import { queryStore, sidePanelStore, jeepneyStore } from "@lib/store.svelte";
  import BuildingResult from "./BuildingResult.svelte";
  import CollegeResult from "./CollegeResult.svelte";
  import DivisionResult from "./DivisionResult.svelte";
  import DormResult from "./DormResult.svelte";
  import EventsList from "./EventsList.svelte";
  import EventResult from "./EventResult.svelte";
  import RoomResult from "@ui/room/RoomResult.svelte";
  import ClassQuery from "./ClassQuery.svelte";
  import ClassesList from "./ClassesList.svelte";
  import CampusBrowseList from "./CampusBrowseList.svelte";
  import JeepneyStopPanel from "./JeepneyStopPanel.svelte";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import X from "@lucide/svelte/icons/x";
  import { JEEPNEY_ROUTES } from "@constants/jeepney-routes";
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

  const peekLabel = $derived.by(() => {
    if (jeepneyStore.selectedStopIndex !== null) {
      const route = jeepneyStore.selectedRouteId
        ? (JEEPNEY_ROUTES.find(
            (entry) => entry.id === jeepneyStore.selectedRouteId,
          ) ?? null)
        : null;
      const stop =
        route && jeepneyStore.selectedStopIndex !== null
          ? (route.stops[jeepneyStore.selectedStopIndex] ?? null)
          : null;
      return stop?.name ?? "Jeepney stop";
    }
    if (queryStore.category === null) return "Details";
    if (queryStore.category === "classes") return "All classes";
    if (queryStore.category === "events") return "Campus events";
    if (queryStore.category === "browse") {
      return queryStore.queryValue || "Browse campus";
    }
    return queryStore.queryValue || queryStore.inputValue || "Details";
  });

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

  function closeSelection() {
    if (jeepneyStore.selectedStopIndex !== null) {
      jeepneyStore.closeStop();
      return;
    }
    queryStore.clearQuery();
  }
</script>

<div class="side-panel-wrapper">
  <Search />
  <div class="side-panel-controls">
    {#if queryStore.category !== null || jeepneyStore.selectedStopIndex !== null}
      <div class="drawer" class:is-collapsed={sidePanelStore.collapsed}>
        <div class="drawer-sheet">
          {#if mobile.current && sidePanelStore.collapsed}
            <div class="drawer-peek">
              <button
                class="drawer-peek-expand"
                type="button"
                aria-expanded={false}
                aria-controls="side-panel-details"
                aria-label={toggleLabel}
                title={toggleLabel}
                onclick={togglePanel}
              >
                <span class="drawer-peek-label">{peekLabel}</span>
                <ChevronUp size={16} aria-hidden="true" />
              </button>
              <button
                class="drawer-peek-close"
                type="button"
                aria-label="Close details"
                title="Close details"
                onclick={closeSelection}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          {:else}
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
                <span class="drawer-grab" aria-hidden="true"></span>
              {:else if sidePanelStore.collapsed}
                <ChevronRight size={20} aria-hidden="true" />
              {:else}
                <ChevronLeft size={20} aria-hidden="true" />
              {/if}
            </button>
          {/if}
          <div class="drawer-card">
            <div
              id="side-panel-details"
              class="side-panel-details map-chrome-scroll"
              aria-hidden={sidePanelStore.collapsed}
            >
              {#if jeepneyStore.selectedStopIndex !== null}
                <JeepneyStopPanel />
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

  /* Desktop: pin the open drawer to the flex space between search and status bar. */
  @media (min-width: 48.0625rem) {
    .drawer:not(.is-collapsed) {
      position: absolute;
      top: calc(var(--search-block-height, 3.25rem) + 0.75rem);
      bottom: 0;
      left: 0;
      height: auto;
    }
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
    overscroll-behavior: contain;
    scroll-padding: 4px;
  }
  .side-panel-details > :global(*) {
    flex: 0 1 auto;
    min-height: 0;
    width: 100%;
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
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-left: none;
    border-radius: 0 0.75rem 0.75rem 0;
    background-color: var(--map-chrome-surface, hsl(5 20% 97%));
    color: #7b1113;
    cursor: pointer;
    box-shadow: var(--map-chrome-shadow);
    z-index: -1;
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

    .drawer-peek {
      display: flex;
      align-items: stretch;
      flex-shrink: 0;
      min-height: 2rem;
      padding: 0.25rem
        max(
          var(--map-search-inline-pad, 0.625rem),
          env(safe-area-inset-right, 0px)
        )
        0.25rem
        max(
          var(--map-search-inline-pad, 0.625rem),
          env(safe-area-inset-left, 0px)
        );
      gap: 0.25rem;
    }

    .drawer-peek-expand {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.125rem 0.375rem;
      border: none;
      border-radius: 0.375rem;
      background: transparent;
      color: #18181b;
      cursor: pointer;
    }

    .drawer-peek-expand:hover,
    .drawer-peek-expand:focus-visible {
      background: hsl(5 53% 95% / 0.65);
    }

    .drawer-peek-expand:focus-visible {
      outline: 2px solid #7b1113;
      outline-offset: 1px;
    }

    .drawer-peek-label {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1.2;
      text-align: left;
    }

    .drawer-peek-expand :global(svg) {
      flex-shrink: 0;
      color: #7b1113;
    }

    .drawer-peek-close {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      padding: 0;
      border: none;
      border-radius: 0.375rem;
      background: transparent;
      color: #71717a;
      cursor: pointer;
    }

    .drawer-peek-close:hover,
    .drawer-peek-close:focus-visible {
      background: hsl(5 53% 95% / 0.65);
      color: #7b1113;
    }

    .drawer-peek-close:focus-visible {
      outline: 2px solid #7b1113;
      outline-offset: 1px;
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
      min-height: 1.25rem;
      padding: 0.25rem
        max(
          var(--map-search-inline-pad, 0.625rem),
          env(safe-area-inset-right, 0px)
        )
        0.3125rem
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
      cursor: pointer;
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

    .side-panel-details {
      scroll-padding-bottom: 0.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .drawer,
    .drawer-card {
      transition: none;
    }
  }
</style>
