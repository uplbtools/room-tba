<script lang="ts">
  import CalendarPlus from "@lucide/svelte/icons/calendar-plus";
  import LogOut from "@lucide/svelte/icons/log-out";
  import MapPinPlus from "@lucide/svelte/icons/map-pin-plus";
  import Pencil from "@lucide/svelte/icons/pencil";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Settings from "@lucide/svelte/icons/settings";
  import Users from "@lucide/svelte/icons/users";
  import {
    adminAuthStore,
    editorChromeStore,
    eventPlacementStore,
    mapEditStore,
    proposalsStore,
    toastStore,
  } from "@lib/store.svelte";
  import { beginEventPlacement } from "@lib/event-placement";
  import ProposalReviewPanel from "@ui/ProposalReviewPanel.svelte";

  type Props = {
    onclose?: () => void;
  };

  let { onclose }: Props = $props();

  const adminLabel = $derived(
    adminAuthStore.displayName ?? adminAuthStore.username ?? "editor",
  );
  const roleLabel = $derived(
    adminAuthStore.role === "admin"
      ? "Admin"
      : adminAuthStore.role === "editor"
        ? "Editor"
        : "Contributor",
  );
  const placingEvent = $derived(
    eventPlacementStore.active || eventPlacementStore.creating,
  );

  function toggleMapEditMode() {
    mapEditStore.toggle();
  }

  function handleAddEvent() {
    if (!beginEventPlacement({ propose: false })) return;
    editorChromeStore.closeShelf();
    onclose?.();
    toastStore.show("Click the map to place the new event.", "info");
  }

  function handleAddToMap() {
    editorChromeStore.openAdditionModal();
    onclose?.();
  }

  async function handleLogout() {
    editorChromeStore.closeShelf();
    editorChromeStore.closeAdditionModal();
    mapEditStore.close();
    onclose?.();
    await adminAuthStore.logout();
    toastStore.show("Signed out.", "info");
  }

  function handleAccountSettings() {
    editorChromeStore.closeShelf();
    onclose?.();
    adminAuthStore.openAccountSettings();
  }

  function handleManageUsers() {
    editorChromeStore.closeShelf();
    onclose?.();
    adminAuthStore.openManageUsers();
  }

  function addEventLabel() {
    if (eventPlacementStore.creating) return "Creating event…";
    if (eventPlacementStore.active) return "Choose event location";
    return "Add event";
  }
</script>

<section class="editor-shelf" aria-label="Editor controls">
  <div class="editor-shelf-status">
    <ShieldCheck size={16} aria-hidden="true" />
    <div class="editor-shelf-status-copy">
      <strong>Signed in as {roleLabel.toLowerCase()}</strong>
      <small>{adminLabel}</small>
    </div>
    {#if proposalsStore.pendingCount > 0}
      <span class="editor-shelf-badge"
        >{proposalsStore.pendingCount} pending</span
      >
    {/if}
  </div>

  {#if adminAuthStore.canPublish}
    <div class="editor-shelf-actions">
      <button
        type="button"
        class="editor-shelf-action"
        class:active={mapEditStore.enabled}
        aria-pressed={mapEditStore.enabled}
        onclick={toggleMapEditMode}
      >
        <Pencil size={16} aria-hidden="true" />
        {mapEditStore.enabled ? "Turn off map edit" : "Turn on map edit"}
      </button>
      <button
        type="button"
        class="editor-shelf-action"
        disabled={placingEvent}
        onclick={handleAddEvent}
      >
        <CalendarPlus size={16} aria-hidden="true" />
        {addEventLabel()}
      </button>
      <button
        type="button"
        class="editor-shelf-action"
        onclick={handleAddToMap}
      >
        <MapPinPlus size={16} aria-hidden="true" />
        Add to map…
      </button>
    </div>
  {/if}

  <ProposalReviewPanel />

  <button
    type="button"
    class="editor-shelf-action"
    onclick={handleAccountSettings}
  >
    <Settings size={16} aria-hidden="true" />
    Account settings
  </button>

  {#if adminAuthStore.role === "admin"}
    <button
      type="button"
      class="editor-shelf-action"
      onclick={handleManageUsers}
    >
      <Users size={16} aria-hidden="true" />
      Manage users
    </button>
  {/if}

  <button
    type="button"
    class="editor-shelf-action danger"
    onclick={handleLogout}
  >
    <LogOut size={16} aria-hidden="true" />
    Sign out
  </button>
</section>

<style>
  .editor-shelf {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    max-width: 100%;
  }

  .editor-shelf-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    color: hsl(160, 84%, 22%);
    font-size: 0.8125rem;
  }

  .editor-shelf-status-copy {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
    flex: 1 1 auto;
  }

  .editor-shelf-status-copy small {
    overflow: hidden;
    color: hsl(0, 0%, 42%);
    font-size: 0.75rem;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .editor-shelf-badge {
    flex-shrink: 0;
    border-radius: 999px;
    background: hsl(5, 65%, 42%);
    color: white;
    font-size: 0.625rem;
    font-weight: 700;
    line-height: 1;
    padding: 0.2rem 0.45rem;
    white-space: nowrap;
  }

  .editor-shelf-actions {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .editor-shelf-action {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.375rem;
    width: 100%;
    min-height: 2rem;
    border: 1px solid #d8b9ba;
    border-radius: 0.625rem;
    background-color: white;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 700;
    padding: 0.3125rem 0.5rem;
    text-align: left;
  }

  .editor-shelf-action:hover,
  .editor-shelf-action:focus-visible {
    background-color: hsl(5, 53%, 98%);
  }

  .editor-shelf-action:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .editor-shelf-action:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .editor-shelf-action.active {
    border-color: hsl(160, 84%, 26%);
    background-color: hsl(160, 84%, 26%);
    color: white;
  }

  .editor-shelf-action.danger {
    border-color: hsl(0, 70%, 88%);
    color: hsl(0, 70%, 38%);
  }
</style>
