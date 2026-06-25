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
  const activeEvents = $derived(
    loaded ? events.filter((event) => event.status === "active") : [],
  );

  function openActiveEvent(event: (typeof activeEvents)[number]) {
    queryStore.updateQuery({
      category: "event",
      type: "result",
      value: event.title,
      eventSlug: event.slug,
    });
  }

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
    {#if activeEvents.length > 0 && queryStore.category !== "event" && queryStore.category !== "events"}
      <div class="event-banner-stack" role="status" aria-live="polite">
        {#each activeEvents as activeEvent (activeEvent.slug)}
          <button
            class="event-banner"
            type="button"
            aria-label={`${activeEvent.title} is happening now. Tap to see it on the map.`}
            onclick={() => openActiveEvent(activeEvent)}
          >
            <span class="event-banner-copy">
              <span class="event-banner-label">Happening now</span>
              <span class="event-banner-title">{activeEvent.title}</span>
            </span>
            <span class="event-banner-cta" aria-hidden="true">See on map ›</span
            >
          </button>
        {/each}
      </div>
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

  .event-banner-stack {
    position: absolute;
    top: 0.75rem;
    left: 50%;
    z-index: 12;
    translate: -50% 0;
    display: flex;
    width: min(32rem, calc(100% - 1rem));
    flex-direction: column;
    gap: 0.45rem;
    pointer-events: none;
  }

  .event-banner {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    border: 1px solid #d8b9ba;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.96);
    color: #7b1113;
    cursor: pointer;
    font: inherit;
    text-align: left;
    padding: 0.5rem 0.875rem;
    pointer-events: auto;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
    transition:
      background-color 0.16s,
      border-color 0.16s,
      box-shadow 0.16s;
  }

  .event-banner:hover,
  .event-banner:focus-visible {
    background: #fff;
    border-color: #c58f91;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
  }

  .event-banner:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }

  .event-banner-copy {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
    min-width: 0;
  }

  .event-banner-label {
    color: #15803d;
    font-size: 0.625rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    line-height: 1;
    text-transform: uppercase;
  }

  .event-banner-title {
    overflow: hidden;
    color: #7b1113;
    font-size: 0.875rem;
    font-weight: 800;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-banner-cta {
    flex: 0 0 auto;
    margin-left: auto;
    color: #7b1113;
    font-size: 0.8125rem;
    font-weight: 800;
    white-space: nowrap;
  }

  @media (max-width: 30rem) {
    .event-banner-cta {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .event-banner {
      transition: none;
    }
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
