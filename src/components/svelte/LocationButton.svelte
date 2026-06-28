<script lang="ts">
  import { onMount } from "svelte";
  import Locate from "@lucide/svelte/icons/locate";
  import LocateFixed from "@lucide/svelte/icons/locate-fixed";
  import Plus from "@lucide/svelte/icons/plus";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import {
    adminAuthStore,
    editorChromeStore,
    floatingControlPanelStore,
    locationStore,
    mapEditStore,
    mapStore,
    proposalsStore,
    toastStore,
  } from "@lib/store.svelte";
  import SuggestAdditionPanel from "./SuggestAdditionPanel.svelte";

  let centered: boolean = $state(false);
  const suggestPanelId = "suggest-addition";
  const suggestMenuOpen = $derived(
    floatingControlPanelStore.openPanel === suggestPanelId,
  );

  onMount(() => {
    adminAuthStore.hydrate();
  });

  const showEditorControls = $derived(
    adminAuthStore.canPublish || adminAuthStore.canReview,
  );
  const showSuggestAddition = $derived(!adminAuthStore.canPublish);

  const handleLocationClick = () => {
    if (!locationStore.coords) {
      locationStore.requestLocation();
      return;
    }
    if (!mapStore.mapInstance) {
      toastStore.show("Map component is still initializing", "info");
      return;
    }

    centered = true;
    mapStore.mapInstance.flyTo({
      center: locationStore.coords,
      zoom: 17,
      offset: [0, -24],
      bearing: locationStore.bearing ?? 0,
      duration: 1500,
    });
  };

  function openEditorShelf() {
    editorChromeStore.toggleShelf();
  }
</script>

<div class="map-control-stack">
  {#if showEditorControls}
    <button
      class="map-control-btn"
      class:active={mapEditStore.enabled || editorChromeStore.shelfOpen}
      onclick={openEditorShelf}
      title={mapEditStore.enabled
        ? "Editor tools: map edit mode on"
        : "Open editor tools"}
      aria-label={mapEditStore.enabled
        ? "Open editor tools, map edit mode on"
        : "Open editor tools"}
      aria-expanded={editorChromeStore.shelfOpen}
      aria-controls="editor-shelf-panel"
      aria-pressed={mapEditStore.enabled}
    >
      <ShieldCheck />
      {#if proposalsStore.pendingCount > 0}
        <span class="pending-badge" aria-hidden="true"
          >{proposalsStore.pendingCount}</span
        >
      {/if}
    </button>
  {:else if showSuggestAddition}
    <div class="admin-control">
      {#if suggestMenuOpen}
        <div
          id="suggest-addition-menu"
          class="admin-panel suggest-panel"
          role="menu"
          aria-label="Propose a campus addition"
        >
          <SuggestAdditionPanel />
        </div>
      {/if}
      <button
        class="map-control-btn"
        onclick={() => floatingControlPanelStore.toggle(suggestPanelId)}
        title="Propose a new building, room, or event"
        aria-label="Propose a campus addition"
        aria-expanded={suggestMenuOpen}
        aria-controls="suggest-addition-menu"
      >
        <Plus />
      </button>
    </div>
  {/if}

  <button
    class="map-control-btn"
    onclick={handleLocationClick}
    title="My Location"
    aria-label="My Location"
  >
    {#if centered}
      <LocateFixed />
    {:else}
      <Locate />
    {/if}
  </button>
</div>

<style>
  .map-control-stack {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    pointer-events: auto;
  }

  .admin-control {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }

  .map-control-btn {
    position: relative;
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    backdrop-filter: blur(10px);
    border: 1.5px solid var(--map-chrome-border-accent, hsl(5, 40%, 42%));
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: var(
      --map-chrome-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.18),
      0 2px 6px hsla(0, 0%, 0%, 0.18),
      0 8px 20px hsla(0, 0%, 0%, 0.14)
    );
    color: hsl(5, 53%, 32%);
    transition:
      background-color 0.2s,
      border-color 0.2s;

    &:hover {
      background-color: hsl(0, 0%, 99%);
      border-color: hsl(5, 53%, 32%);
    }

    &:focus-visible {
      outline: 2px solid hsl(5, 53%, 32%);
      outline-offset: 2px;
    }

    &.active {
      border-color: hsl(160, 84%, 26%);
      background-color: hsl(160, 84%, 26%);
      color: white;
    }
  }

  .pending-badge {
    position: absolute;
    top: -0.15rem;
    right: -0.15rem;
    min-width: 1.1rem;
    height: 1.1rem;
    padding: 0 0.2rem;
    border-radius: 999px;
    background: hsl(5, 65%, 42%);
    color: white;
    font-size: 0.625rem;
    font-weight: 700;
    line-height: 1.1rem;
    text-align: center;
  }

  .admin-panel {
    display: flex;
    width: 17rem;
    max-width: calc(100vw - 1rem);
    max-height: min(70vh, 28rem);
    flex-direction: column;
    gap: 0.5rem;
    border-radius: 0.875rem;
    background-color: white;
    padding: 0.75rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow-y: auto;
  }

  .suggest-panel {
    width: 17rem;
  }
</style>
