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
  } from "../../lib/store.svelte";
  import Modal from "./modal/Modal.svelte";
  import SidePanel from "./sidepanel/SidePanel.svelte";
  import Map from "./Map.svelte";
  import MapControls from "./MapControls.svelte";
  import StatusBar from "./StatusBar.svelte";
  import Toast from "./Toast.svelte";
  import Building3DViewer from "./Building3DViewer.svelte";
  import AdminLoginModal from "./AdminLoginModal.svelte";
  import type { RecentSearch } from "../../lib/types";
  import { isRecentSearch } from "../../lib/locStorage";
  import SyncToast from "./SyncToast.svelte";
  import { getAppData } from "../../lib/context";

  type Props = {
    initialSearch?: InitialSearchState;
    suppressLandingModal?: boolean;
  };

  const { initialSearch, suppressLandingModal = false }: Props = $props();
  const appData = getAppData();
  const { events, loaded } = $derived(appData());
  const activeEvent = $derived(
    loaded ? (events.find((event) => event.status === "active") ?? null) : null,
  );

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

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      if (modalStore.open) {
        modalStore.closeModal();
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

<div class="app-layout">
  <Map />
  <div class="ui-layer">
    {#if activeEvent && queryStore.category !== "event"}
      <button
        class="event-banner"
        type="button"
        onclick={() =>
          queryStore.updateQuery({
            category: "event",
            type: "result",
            value: activeEvent.title,
          })}
      >
        {activeEvent.title} is active. Tap for map.
      </button>
    {/if}
    <div class="top-right-map-stack" aria-label="Map tools">
      <MapControls />
      <SyncToast stacked />
    </div>
    <!-- <header class="top-header">
      <h2>Room TBA</h2>
    </header> -->
    <div class="inner-layer">
      <SidePanel />
      <StatusBar />
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
    width: 100%;
    height: 100dvh;
    overflow: hidden;
  }
  .inner-layer {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
    flex: 1 0 0;
    min-height: 0;
    pointer-events: none;
    gap: 0.5rem;
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

  .event-banner {
    position: absolute;
    top: 0.75rem;
    left: 50%;
    z-index: 12;
    translate: -50% 0;
    max-width: min(32rem, calc(100% - 1rem));
    border: 1px solid #d8b9ba;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.96);
    color: #7b1113;
    cursor: pointer;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 800;
    padding: 0.5rem 0.875rem;
    pointer-events: auto;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
  }

  .top-right-map-stack {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 15;
    display: flex;
    width: min(22.5rem, calc(100% - 1rem));
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    pointer-events: none;
  }

  :global(*) {
    margin: unset;
    box-sizing: border-box;
  }

  @media (max-width: 800px) {
    .top-right-map-stack {
      top: 4rem;
    }
  }
</style>
