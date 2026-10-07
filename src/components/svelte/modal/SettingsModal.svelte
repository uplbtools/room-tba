<script lang="ts">
  import MapViewControls from "@ui/MapViewControls.svelte";
  import TerrainControl from "@ui/TerrainControl.svelte";
  import ScheduleImportPanel from "@ui/ScheduleImportPanel.svelte";
  import MessageSquare from "@lucide/svelte/icons/message-square";
  import ModalHeader from "./ModalHeader.svelte";
  import { TERRAIN_ENABLED } from "@constants/map-terrain";
  import { clearCachedData } from "@lib/local/clear-cached-data";
  import {
    resyncCampusData,
    type ResyncOutcome,
  } from "@lib/local/resync-campus-data";
  import { modalStore, syncToastStore } from "@lib/store.svelte";
  import "../map-chrome/map-chrome.css";

  let confirming = $state(false);
  let clearing = $state(false);
  let confirmButton = $state<HTMLButtonElement | null>(null);
  let resyncing = $state(false);
  let resyncResult = $state<ResyncOutcome | null>(null);

  const RESYNC_MESSAGE: Record<ResyncOutcome, string> = {
    synced: "Campus data is up to date.",
    failed: "Resync failed. Check your connection and try again.",
    timeout: "Still syncing in the background. Check again in a moment.",
  };

  // No reload to signal success here, so the result has to be said out loud.
  async function resync() {
    if (resyncing) return;
    resyncing = true;
    resyncResult = null;
    try {
      resyncResult = await resyncCampusData(() => ({
        allSynced: syncToastStore.allSynced,
        syncError: syncToastStore.syncError,
      }));
    } finally {
      resyncing = false;
    }
  }

  // Opening the confirm swaps the button out from under the pointer, which
  // would drop keyboard focus to <body>. Move it to the confirm instead.
  $effect(() => {
    if (confirming) confirmButton?.focus();
  });

  // The reload is the success signal, so there is no toast: either the page
  // comes back clean or the button is still sitting there.
  async function clearAndReload() {
    if (clearing) return;
    clearing = true;
    await clearCachedData();
    location.reload();
  }
</script>

<div class="settings-modal">
  <ModalHeader id="settings-modal-title" title="Settings" />
  <div class="settings-modal__scroll map-chrome-scroll">
    <section class="settings-modal__section">
      <h3>Map</h3>
      <MapViewControls embedded variant="settings" />
    </section>
    {#if TERRAIN_ENABLED}
      <section class="settings-modal__section">
        <h3>Terrain</h3>
        <TerrainControl embedded />
      </section>
    {/if}
    <section class="settings-modal__section">
      <h3>Schedule</h3>
      <ScheduleImportPanel embedded />
    </section>
    <section class="settings-modal__section">
      <h3>Feedback</h3>
      <div class="map-chrome-row">
        <span class="map-chrome-row__label">Found a problem or have an idea?</span>
        <div class="map-chrome-row__control">
          <button
            type="button"
            class="map-chrome-action-chip"
            onclick={() => modalStore.openModal("feedback")}
          >
            <MessageSquare size={14} aria-hidden="true" />
            Send feedback
          </button>
        </div>
      </div>
    </section>
    <section class="settings-modal__section">
      <h3>Storage</h3>

      <div class="settings-modal__task">
        <div class="map-chrome-row">
          <span class="map-chrome-row__label">Campus data</span>
          <div class="map-chrome-row__control">
            <button
              type="button"
              class="map-chrome-action-chip"
              aria-describedby="settings-resync-hint"
              disabled={resyncing}
              onclick={resync}
            >
              {resyncing ? "Resyncing…" : "Resync"}
            </button>
          </div>
        </div>
        <p id="settings-resync-hint" class="map-chrome-row-hint">
          Fetches rooms and classes again. Your downloaded offline maps are
          kept.
        </p>
        {#if resyncResult}
          <p
            class="map-chrome-row-hint"
            class:map-chrome-row-hint--warn={resyncResult !== "synced"}
            class:map-chrome-row-hint--ok={resyncResult === "synced"}
            role="status"
          >
            {RESYNC_MESSAGE[resyncResult]}
          </p>
        {/if}
      </div>
    </section>

    <section
      class="settings-modal__section settings-modal__danger-zone"
      aria-labelledby="settings-reset-heading"
    >
      <h3 id="settings-reset-heading">Reset</h3>
      <div class="map-chrome-row">
        <span class="map-chrome-row__label">Offline data</span>
        {#if !confirming}
          <div class="map-chrome-row__control">
            <button
              type="button"
              class="map-chrome-action-chip settings-modal__danger"
              aria-describedby="settings-storage-hint"
              onclick={() => (confirming = true)}
            >
              Reset offline data
            </button>
          </div>
        {/if}
      </div>
      <p id="settings-storage-hint" class="map-chrome-row-hint">
        Removes saved campus data, offline maps, and cached app files. Your
        saved class plans stay.
      </p>
      {#if confirming}
        <p
          id="settings-storage-warning"
          class="map-chrome-row-hint map-chrome-row-hint--warn"
        >
          Downloaded offline maps will be removed. You will need a connection
          to download them again.
        </p>
        <div class="map-chrome-row-actions">
          <button
            type="button"
            class="map-chrome-action-chip settings-modal__danger settings-modal__danger--solid"
            aria-describedby="settings-storage-warning"
            disabled={clearing}
            bind:this={confirmButton}
            onclick={clearAndReload}
          >
            {clearing ? "Resetting…" : "Reset and reload"}
          </button>
          <button
            type="button"
            class="map-chrome-action-chip"
            disabled={clearing}
            onclick={() => (confirming = false)}
          >
            Cancel
          </button>
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .settings-modal {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 0.25rem;
    flex: 1 1 auto;
    min-height: 0;
  }

  .settings-modal__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    /* Left padding keeps glyph edges out of the overflow clip (the "E" in
       Explore was losing its left stem). */
    padding: 0 0.5rem 0.25rem;
  }

  .settings-modal__section {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .settings-modal__section h3 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: hsl(0, 0%, 40%);
  }

  .settings-modal__task {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  /* The destructive reset gets its own framed section, apart from Resync, so
     it reads as the separate, bigger hammer it is. */
  .settings-modal__danger-zone {
    padding: 0.625rem 0.75rem 0.75rem;
    border: 1px solid hsl(0, 55%, 86%);
    border-radius: 0.625rem;
    background: hsl(0, 75%, 99%);
  }

  .settings-modal__danger-zone h3 {
    color: hsl(0, 70%, 32%);
  }

  /* The chrome chip is maroon like the rest of the app, so destructive gets a
     true red: outlined to arm, filled to confirm. Never the same as Resync. */
  .settings-modal__danger {
    border-color: hsl(0, 55%, 70%);
    color: hsl(0, 70%, 34%);
  }

  .settings-modal__danger:hover:not(:disabled),
  .settings-modal__danger:focus-visible {
    border-color: hsl(0, 60%, 52%);
    background: hsl(0, 75%, 98%);
  }

  .settings-modal__danger--solid,
  .settings-modal__danger--solid:hover:not(:disabled),
  .settings-modal__danger--solid:focus-visible {
    border-color: hsl(0, 70%, 32%);
    background: hsl(0, 70%, 32%);
    color: white;
  }

  .settings-modal__danger--solid:hover:not(:disabled) {
    background: hsl(0, 70%, 27%);
    border-color: hsl(0, 70%, 27%);
  }
</style>
