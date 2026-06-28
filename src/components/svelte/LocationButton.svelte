<script lang="ts">
  import { onMount } from "svelte";
  import Locate from "@lucide/svelte/icons/locate";
  import LocateFixed from "@lucide/svelte/icons/locate-fixed";
  import LogOut from "@lucide/svelte/icons/log-out";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Plus from "@lucide/svelte/icons/plus";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import {
    adminAuthStore,
    eventPlacementStore,
    floatingControlPanelStore,
    locationStore,
    mapEditStore,
    mapStore,
    proposalsStore,
    toastStore,
  } from "@lib/store.svelte";
  import { beginEventPlacement } from "@lib/event-placement";
  import ProposalReviewPanel from "./ProposalReviewPanel.svelte";
  import SuggestAdditionPanel from "./SuggestAdditionPanel.svelte";
  import CalendarPlus from "@lucide/svelte/icons/calendar-plus";

  let centered: boolean = $state(false);
  const adminPanelId = "admin";
  const suggestPanelId = "suggest-addition";
  const adminMenuOpen = $derived(
    floatingControlPanelStore.openPanel === adminPanelId,
  );
  const suggestMenuOpen = $derived(
    floatingControlPanelStore.openPanel === suggestPanelId,
  );
  const adminLabel = $derived(adminAuthStore.username ?? "admin");

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

  function toggleMapEditMode() {
    mapEditStore.toggle();
  }

  async function handleLogout() {
    floatingControlPanelStore.close(adminPanelId);
    mapEditStore.close();
    await adminAuthStore.logout();
    toastStore.show("Signed out.", "info");
  }

  const placingEvent = $derived(
    eventPlacementStore.active || eventPlacementStore.creating,
  );

  function handleAddEvent() {
    if (!beginEventPlacement({ propose: false })) return;
    floatingControlPanelStore.close(adminPanelId);
    toastStore.show("Click the map to place the new event.", "info");
  }

  function addEventLabel() {
    if (eventPlacementStore.creating) return "Creating event...";
    if (eventPlacementStore.active) return "Choose event location on map";
    return "Add event";
  }
</script>

<div class="map-control-stack">
  {#if showEditorControls}
    <div class="admin-control">
      {#if adminMenuOpen}
        <div
          id="admin-control-menu"
          class="admin-panel"
          role="menu"
          aria-label="Editor controls"
        >
          <div class="admin-status">
            <ShieldCheck size={16} />
            <span>
              <strong>Editor signed in</strong>
              <small>{adminLabel}</small>
            </span>
          </div>
          {#if adminAuthStore.canPublish}
            <button
              type="button"
              class="admin-menu-action"
              class:active={mapEditStore.enabled}
              role="menuitem"
              aria-pressed={mapEditStore.enabled}
              onclick={toggleMapEditMode}
            >
              <Pencil size={16} />
              {mapEditStore.enabled ? "Turn off map edit" : "Turn on map edit"}
            </button>
            <button
              type="button"
              class="admin-menu-action"
              role="menuitem"
              disabled={placingEvent}
              onclick={handleAddEvent}
            >
              <CalendarPlus size={16} />
              {addEventLabel()}
            </button>
            <div class="admin-addition-section">
              <p class="admin-section-label">Add to map</p>
              <SuggestAdditionPanel mode="publish" panelId={adminPanelId} />
            </div>
          {/if}
          <ProposalReviewPanel />
          <button
            type="button"
            class="admin-menu-action danger"
            role="menuitem"
            onclick={handleLogout}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      {/if}
      <button
        class="map-control-btn"
        class:active={mapEditStore.enabled}
        onclick={() => floatingControlPanelStore.toggle(adminPanelId)}
        title={mapEditStore.enabled
          ? "Editor controls: map edit mode on"
          : "Editor controls"}
        aria-label={mapEditStore.enabled
          ? "Editor controls, map edit mode on"
          : "Editor controls"}
        aria-expanded={adminMenuOpen}
        aria-controls="admin-control-menu"
        aria-pressed={mapEditStore.enabled}
      >
        <ShieldCheck />
        {#if proposalsStore.pendingCount > 0}
          <span class="pending-badge" aria-hidden="true"
            >{proposalsStore.pendingCount}</span
          >
        {/if}
      </button>
    </div>
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

  .admin-addition-section {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding-top: 0.25rem;
    border-top: 1px solid hsl(0, 0%, 90%);
  }

  .admin-section-label {
    margin: 0;
    color: hsl(5, 53%, 32%);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .suggest-panel {
    width: 17rem;
  }

  .admin-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: hsl(160, 84%, 22%);
    font-size: 0.8125rem;
  }

  .admin-status span {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.1rem;
  }

  .admin-status small {
    overflow: hidden;
    color: hsl(0, 0%, 42%);
    font-size: 0.75rem;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .admin-menu-action {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
    border: 1px solid #d8b9ba;
    border-radius: 0.625rem;
    background-color: white;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 700;
    padding: 0.55rem 0.625rem;
  }

  .admin-menu-action:hover,
  .admin-menu-action:focus-visible {
    background-color: hsl(5, 53%, 98%);
  }

  .admin-menu-action:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .admin-menu-action.active {
    border-color: hsl(160, 84%, 26%);
    background-color: hsl(160, 84%, 26%);
    color: white;
  }

  .admin-menu-action.danger {
    border-color: hsl(0, 70%, 88%);
    color: hsl(0, 70%, 38%);
  }
</style>
