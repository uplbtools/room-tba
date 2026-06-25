<script lang="ts">
  import { onMount } from "svelte";
  import type { InitialSearchState } from "../../lib/app-data";
  import {
    modalStore,
    queryStore,
    locationStore,
    toastStore,
    building3DStore,
    adminAuthStore,
    mapEditStore,
    mapToolsStore,
    sidePanelStore,
  } from "../../lib/store.svelte";
  import Modal from "./modal/Modal.svelte";
  import SidePanel from "./sidepanel/SidePanel.svelte";
  import Map from "./Map.svelte";
  import MapToolsFlyout from "./MapToolsFlyout.svelte";
  import MapViewControls from "./MapViewControls.svelte";
  import LocationButton from "./LocationButton.svelte";
  import StatusBar from "./StatusBar.svelte";
  import Toast from "./Toast.svelte";
  import Building3DViewer from "./Building3DViewer.svelte";
  import AdminLoginModal from "./AdminLoginModal.svelte";
  import type { RecentSearch } from "../../lib/types";
  import { isRecentSearch } from "../../lib/locStorage";

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

    if (new URLSearchParams(window.location.search).get("editor") === "login") {
      adminAuthStore.openLogin();
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

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      if (modalStore.open) {
        modalStore.closeModal();
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

<div class="app-layout" class:edit-mode={mapEditStore.enabled}>
  <Map />
  <div class="ui-layer" class:drawer-expanded={drawerExpanded}>
    <div class="top-right-map-stack" aria-label="Map tools">
      <MapToolsFlyout />
      <div class="desktop-camera-controls" aria-label="Map camera">
        <MapViewControls variant="camera" />
      </div>
    </div>
    <div class="inner-layer">
      <SidePanel />
      <div class="bottom-band">
        <div
          class="location-fab-stack"
          class:drawer-lift={drawerExpanded}
          aria-label="Location and editor"
        >
          <LocationButton />
        </div>
        <StatusBar />
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
</div>

<style>
  .app-layout {
    --map-ui-padding: 0.5rem;
    --search-block-height: 3.25rem;
    --status-bar-block-height: 2.75rem;
    --drawer-peek-offset: 1.75rem;
    --mobile-detail-sheet-height: min(
      58dvh,
      calc(
        100dvh - var(--search-block-height) - var(--status-bar-block-height) -
          var(--edit-bar-height) - var(--map-ui-padding) * 2 -
          env(safe-area-inset-bottom, 0px)
      )
    );
    --edit-bar-height: 0rem;
    --pill-padding-x: 0.875rem;
    --map-chrome-radius: 1rem;
    --map-chrome-toggle-size: 2rem;
    --map-chrome-toggle-radius: 0.625rem;
    /* Map-face controls: readable on light tiles and white building footprints */
    --map-chrome-surface: rgba(255, 255, 255, 0.98);
    --map-chrome-border: hsl(0, 0%, 58%);
    --map-chrome-border-accent: hsl(5, 40%, 42%);
    --map-chrome-shadow:
      0 0 0 1px hsla(0, 0%, 0%, 0.18), 0 2px 6px hsla(0, 0%, 0%, 0.18),
      0 8px 20px hsla(0, 0%, 0%, 0.14);
    --map-chrome-panel-shadow:
      0 0 0 1px hsla(0, 0%, 0%, 0.14), 0 4px 14px hsla(0, 0%, 0%, 0.2),
      0 10px 28px hsla(0, 0%, 0%, 0.12);

    width: 100%;
    height: 100dvh;
    overflow: hidden;
  }

  .app-layout.edit-mode {
    --edit-bar-height: 3rem;
  }

  :global(.chrome-toggle-btn) {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: var(--map-chrome-toggle-size, 2rem);
    height: var(--map-chrome-toggle-size, 2rem);
    border: 1px solid #d8b9ba;
    border-radius: var(--map-chrome-toggle-radius, 0.625rem);
    background: #fffafa;
    color: #7b1113;
    transition:
      background-color 0.16s,
      border-color 0.16s;
  }

  :global(button.chrome-toggle-btn) {
    cursor: pointer;
    font: inherit;
    padding: 0;
  }

  :global(button.chrome-toggle-btn:hover),
  :global(button.chrome-toggle-btn:focus-visible) {
    border-color: #c58f91;
    background: #fdf3f3;
  }

  :global(button.chrome-toggle-btn:focus-visible) {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
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
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    flex-shrink: 0;
    width: 100%;
    pointer-events: none;
    /* Reserve horizontal space so status bar text does not sit under FABs */
    --bottom-fab-inset: 3.75rem;
  }

  :global(.map) {
    width: 100%;
    height: 100%;
  }

  .ui-layer {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 10;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
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
    }
  }

  .location-fab-stack {
    position: relative;
    z-index: 14;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    pointer-events: none;
  }

  :global(*) {
    margin: unset;
    box-sizing: border-box;
  }

  @media (max-width: 48rem) {
    .top-right-map-stack {
      top: calc(var(--search-block-height) + var(--map-ui-padding) + 2px);
      padding-top: 2px;
      padding-right: 2px;
    }

    /* When the drawer sheet is open, lift FABs above its peek handle */
    .location-fab-stack.drawer-lift {
      position: fixed;
      right: var(--map-ui-padding);
      bottom: calc(
        var(--status-bar-block-height) + var(--map-ui-padding) +
          env(safe-area-inset-bottom, 0px) + var(--mobile-detail-sheet-height) +
          var(--map-ui-padding)
      );
    }
  }
</style>
