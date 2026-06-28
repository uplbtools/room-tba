<script lang="ts">
  import { onMount } from "svelte";
  import type { InitialSearchState } from "@lib/app-data";
  import {
    modalStore,
    queryStore,
    locationStore,
    toastStore,
    building3DStore,
    adminAuthStore,
    mapEditStore,
    mapToolsStore,
    editorChromeStore,
    sidePanelStore,
    floatingControlPanelStore,
  } from "@lib/store.svelte";
  import Modal from "@ui/modal/Modal.svelte";
  import MainControls from "@ui/controls/MainControls.svelte";
  import Map from "@ui/Map.svelte";
  import MapToolsFlyout from "@ui/MapToolsFlyout.svelte";
  import MapViewControls from "@ui/MapViewControls.svelte";
  import MapDimensionToggle from "@ui/MapDimensionToggle.svelte";
  import LocationButton from "@ui/LocationButton.svelte";
  import MapAttribution from "@ui/MapAttribution.svelte";
  import StatusBar from "@ui/StatusBar.svelte";
  import Toast from "@ui/Toast.svelte";
  import Building3DViewer from "@ui/Building3DViewer.svelte";
  import AdminLoginModal from "@ui/AdminLoginModal.svelte";
  import EditorAdditionModal from "@ui/EditorAdditionModal.svelte";
  import EditorScreen from "@ui/EditorScreen.svelte";
  import EntityUrlSync from "@ui/EntityUrlSync.svelte";
  import "./map-chrome/map-chrome.css";
  import { observeBlockHeight } from "@lib/layout-css-vars";
  import type { RecentSearch } from "@lib/types";
  import { isRecentSearch } from "@lib/locStorage";

  type Props = {
    initialSearch?: InitialSearchState;
    suppressLandingModal?: boolean;
  };

  const { initialSearch, suppressLandingModal = false }: Props = $props();

  const updateData = (queryHistory: RecentSearch[]) => {
    localStorage.setItem("recent-search", JSON.stringify(queryHistory));
  };
  onMount(() => {
    const hideLanding = localStorage.getItem("hideLandingModal");
    const recentSearchesLS = localStorage.getItem("recent-search");
    try {
      const parsedSearches: unknown[] = JSON.parse(recentSearchesLS ?? "[]");
      parsedSearches.forEach((parsedSearch) => {
        if (isRecentSearch(parsedSearch)) {
          queryStore.addRecentSearch(parsedSearch);
        }
      });
    } catch {
      queryStore.recentSearches = [];
    }
    if (initialSearch) {
      queryStore.hydrateQuery({
        category: initialSearch.category,
        type: "result",
        value: initialSearch.value,
        eventSlug: initialSearch.eventSlug,
      });
    }

    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get("editor") === "login") {
      adminAuthStore.openLogin();
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (urlParams.get("contribute") === "1") {
      floatingControlPanelStore.openPanel = "suggest-addition";
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (!suppressLandingModal && hideLanding !== "true") {
      modalStore.openModal("landing");
    }
  });
  $effect(() => {
    updateData(queryStore.recentSearches);
  });

  const drawerExpanded = $derived(
    queryStore.category !== null && !sidePanelStore.collapsed,
  );

  let mapToolsStackEl = $state<HTMLDivElement | null>(null);

  $effect(() => {
    const el = mapToolsStackEl;
    if (!el) return;
    return observeBlockHeight(el, "--map-tools-block-height", {
      shouldSkip: () => window.matchMedia("(max-width: 48rem)").matches,
      skipValue: "0px",
    });
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      if (modalStore.open) {
        modalStore.closeModal();
      } else if (adminAuthStore.loginOpen) {
        adminAuthStore.closeLogin();
      } else if (editorChromeStore.additionModalOpen) {
        editorChromeStore.closeAdditionModal();
      } else if (editorChromeStore.shelfOpen) {
        editorChromeStore.closeShelf();
      } else if (mapToolsStore.open) {
        mapToolsStore.close();
      } else if (queryStore.inputValue !== "" || queryStore.type === "result") {
        queryStore.clearQuery();
        if (locationStore.destination) {
          locationStore.clearDestination();
        }
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<EntityUrlSync />

<div class="app-layout" class:edit-mode={mapEditStore.enabled}>
  <Map />
  <div class="ui-layer" class:drawer-expanded={drawerExpanded}>
    <div
      class="top-right-map-stack"
      aria-label="Map tools"
      bind:this={mapToolsStackEl}
    >
      <MapToolsFlyout />
      <div class="desktop-camera-controls" aria-label="Map camera">
        <div class="camera-controls-card">
          <MapDimensionToggle embedded />
          <div class="camera-controls-card__divider" aria-hidden="true"></div>
          <MapViewControls variant="camera" embedded />
        </div>
      </div>
    </div>
    <div class="inner-layer">
      <MainControls />
      <div class="bottom-band">
        <div class="bottom-band-footer">
          <MapAttribution />
          <StatusBar />
        </div>
        <div
          class="location-fab-stack"
          class:drawer-lift={drawerExpanded}
          aria-label="Location controls"
        >
          <LocationButton />
        </div>
      </div>
    </div>
    {#if toastStore.message}
      <Toast
        message={toastStore.message}
        type={toastStore.type}
        onclose={() => toastStore.clear()}
      />
    {/if}
  </div>
  <Modal />
  {#if building3DStore.buildingName}
    <Building3DViewer name={building3DStore.buildingName} />
  {/if}
  {#if adminAuthStore.loginOpen}
    <AdminLoginModal />
  {/if}
  <EditorAdditionModal />
  <EditorScreen />
</div>

<style>
  .app-layout {
    --map-ui-padding: 0.5rem;
    /* Breathing room between bottom FAB stack and status bar (above inner-layer padding). */
    --bottom-fab-gap: var(--map-ui-padding, 0.5rem);
    --search-block-height: 3.25rem;
    /* Top-left search card + drawer: use viewport minus right-side map chrome. */
    --map-search-chrome-width: min(31rem, calc(100vw - 15rem));
    --status-bar-block-height: 2.75rem;
    --drawer-peek-offset: 1.75rem;
    --map-tools-block-height: 3.25rem;
    --mobile-detail-sheet-top-inset: calc(
      var(--search-block-height) + var(--map-tools-block-height) +
        var(--map-ui-padding) * 2
    );
    --edit-bar-height: 0rem;
    --pill-padding-x: 0.875rem;
    --map-chrome-radius: 1rem;
    --map-chrome-toggle-size: 2rem;
    --map-chrome-toggle-radius: 0.625rem;
    /* Map chrome contrast: warm off-white surfaces + stronger edges so controls
       float above light basemap tiles without dimming the map itself. */
    --map-chrome-surface: hsl(5 20% 97%);
    --map-chrome-panel-bg: hsl(5 18% 96%);
    --map-chrome-border: hsl(5 10% 68%);
    --map-chrome-border-accent: hsl(5 40% 42%);
    --map-chrome-divider: hsl(5 12% 88%);
    --map-chrome-panel-accent-border: hsl(5 15% 78%);
    --map-chrome-band-backdrop: hsla(5, 22%, 96%, 0.82);
    --map-chrome-shadow:
      0 0 0 1px hsla(15, 8%, 20%, 0.14), 0 1px 3px hsla(0, 0%, 0%, 0.12),
      0 4px 12px hsla(0, 0%, 0%, 0.16), 0 10px 24px hsla(0, 0%, 0%, 0.1);
    --map-chrome-panel-shadow:
      0 0 0 1px hsla(15, 8%, 20%, 0.16), 0 2px 8px hsla(0, 0%, 0%, 0.14),
      0 8px 20px hsla(0, 0%, 0%, 0.18), 0 16px 32px hsla(0, 0%, 0%, 0.08);
    --map-chrome-fab-shadow:
      inset 0 0 0 1px hsla(0, 0%, 100%, 0.72), 0 2px 6px hsla(0, 0%, 0%, 0.2),
      0 6px 16px hsla(0, 0%, 0%, 0.14);
    --motion-duration-fast: 150ms;
    --motion-duration-micro: 200ms;
    --motion-duration-panel: 280ms;
    --motion-duration-shelf: 260ms;
    --motion-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
    --motion-ease-in: cubic-bezier(0.4, 0, 1, 1);

    width: 100%;
    height: 100dvh;
    overflow: hidden;
  }

  .app-layout.edit-mode {
    --edit-bar-height: 3rem;
  }

  .inner-layer {
    display: flex;
    flex-direction: column;
    padding: var(--map-ui-padding, 0.5rem);
    padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
    flex: 1 0 0;
    min-height: 0;
    pointer-events: none;
    gap: 0.5rem;
  }

  .bottom-band {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-end;
    gap: 0;
    flex-shrink: 0;
    width: 100%;
    pointer-events: none;
    /* Reserve horizontal space so status bar text does not sit under FABs */
    --bottom-fab-inset: 3.75rem;
  }

  .bottom-band::before {
    content: "";
    position: absolute;
    /* Bleed through inner-layer padding so the fade reaches the viewport edge. */
    left: calc(-1 * var(--map-ui-padding, 0.5rem));
    right: calc(-1 * var(--map-ui-padding, 0.5rem));
    bottom: calc(
      -1 * (var(--map-ui-padding, 0.5rem) + env(safe-area-inset-bottom, 0px))
    );
    height: calc(
      6rem + var(--map-ui-padding, 0.5rem) +
        env(safe-area-inset-bottom, 0px)
    );
    background: linear-gradient(
      to top,
      var(--map-chrome-surface) 0%,
      var(--map-chrome-band-backdrop) 14%,
      hsla(5, 22%, 96%, 0.35) 54%,
      transparent 100%
    );
    pointer-events: none;
    z-index: 0;
  }

  .bottom-band-footer {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.5rem;
    min-width: 0;
    pointer-events: none;
  }

  :global(.map) {
    width: 100%;
    height: 100%;
  }

  .ui-layer {
    position: fixed;
    inset: 0;
    z-index: 10;
    pointer-events: none;
    display: flex;
    flex-direction: column;
  }

  .top-right-map-stack {
    position: absolute;
    top: calc(var(--map-ui-padding) + 2px);
    right: calc(var(--map-ui-padding) + 2px);
    z-index: 15;
    display: flex;
    width: min(22.5rem, calc(100% - 1rem));
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    padding-top: 2px;
    padding-right: 2px;
    overflow: visible;
    pointer-events: none;
  }

  .desktop-camera-controls {
    display: none;
    pointer-events: none;
  }

  @media (min-width: 48.0625rem) {
    .desktop-camera-controls {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      pointer-events: none;
    }
  }

  .camera-controls-card {
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: calc(var(--map-chrome-toggle-size, 2rem) + 0.375rem);
    box-sizing: border-box;
    gap: 0.0625rem;
    padding: 0.1875rem;
    background-color: var(--map-chrome-surface, hsl(5 20% 97%));
    backdrop-filter: blur(10px);
    border: 1.5px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-radius: var(--map-chrome-toggle-radius, 0.625rem);
    box-shadow: var(
      --map-chrome-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.18),
      0 2px 6px hsla(0, 0%, 0%, 0.18),
      0 8px 20px hsla(0, 0%, 0%, 0.14)
    );
  }

  .camera-controls-card__divider {
    height: 1px;
    margin: 0.0625rem 0.125rem;
    background-color: var(--map-chrome-divider, hsl(5 12% 88%));
  }

  .location-fab-stack {
    position: fixed;
    right: calc(var(--map-ui-padding, 0.5rem) + 0.5rem);
    bottom: calc(
      var(--status-bar-block-height, 2.75rem) +
        var(--map-ui-padding, 0.5rem) + env(safe-area-inset-bottom, 0px) +
        var(--bottom-fab-gap, var(--map-ui-padding, 0.5rem))
    );
    z-index: 14;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    pointer-events: none;
    transition: bottom var(--motion-duration-panel) var(--motion-ease-out);
  }

  @media (prefers-reduced-motion: reduce) {
    .app-layout {
      --motion-duration-fast: 0ms;
      --motion-duration-micro: 0ms;
      --motion-duration-panel: 0ms;
      --motion-duration-shelf: 0ms;
    }

    .location-fab-stack {
      transition: none;
    }
  }

  :global(*) {
    margin: unset;
    box-sizing: border-box;
  }

  @media (max-width: 48rem) {
    .app-layout {
      --map-ui-padding: 0;
      --bottom-fab-gap: 0.5rem;
      --map-tools-block-height: 0px;
      --mobile-detail-sheet-top-inset: var(--search-block-height);
    }

    .inner-layer {
      padding: 0;
      gap: 0;
    }

    .bottom-band {
      gap: 0;
      --bottom-fab-inset: 3.25rem;
    }

    .bottom-band-footer {
      flex-direction: column;
      align-items: stretch;
      gap: 0;
    }

    .top-right-map-stack {
      position: fixed;
      inset: 0;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: auto;
      pointer-events: none;
      z-index: 16;
    }

    .top-right-map-stack :global(.map-chrome-fab-trigger) {
      display: none;
    }

    .top-right-map-stack :global(.map-chrome-panel) {
      position: fixed;
      top: var(--search-block-height);
      right: 0;
      left: 0;
      width: auto;
      max-width: none;
      max-height: calc(
        100dvh - var(--search-block-height) - var(--status-bar-block-height)
      );
      margin: 0;
      border-radius: 0;
      border-top: none;
      border-left: none;
      border-right: none;
      pointer-events: auto;
    }

    .top-right-map-stack :global(.map-tools-panel) {
      min-height: min(
        58dvh,
        calc(
          100dvh - var(--search-block-height) - var(--status-bar-block-height)
        )
      );
      padding: 0.875rem 1rem;
      gap: 0.625rem;
    }

    .top-right-map-stack :global(.map-tools-panel .map-chrome-panel-header) {
      font-size: 1rem;
      padding: 0.375rem 0.25rem 0.625rem;
    }

    .top-right-map-stack :global(.map-tools-panel .map-chrome-panel-close) {
      width: 2.75rem;
      height: 2.75rem;
    }

    .top-right-map-stack :global(.map-tools-panel .map-chrome-panel-body) {
      flex: 1 1 auto;
      gap: 0.375rem;
    }

    .top-right-map-stack :global(.map-tools-panel .map-chrome-accordion-toggle) {
      min-height: 2.75rem;
      padding: 0.625rem 0.75rem;
      font-size: 0.9375rem;
    }

    .top-right-map-stack :global(.map-tools-panel .map-chrome-accordion-body) {
      padding: 0.25rem 0 0.5rem;
    }

    /* When the drawer sheet is open, lift FABs above its peek handle */
    .location-fab-stack.drawer-lift {
      position: fixed;
      right: 0.5rem;
      bottom: calc(100dvh - var(--mobile-detail-sheet-top-inset) + 0.5rem);
    }
  }
</style>
