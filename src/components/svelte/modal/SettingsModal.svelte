<script lang="ts">
  import MapViewControls from "@ui/MapViewControls.svelte";
  import TerrainControl from "@ui/TerrainControl.svelte";
  import ScheduleImportPanel from "@ui/ScheduleImportPanel.svelte";
  import { TERRAIN_ENABLED } from "@constants/map-terrain";
  import { clearCachedData } from "@lib/local/clear-cached-data";
  import {
    resyncCampusData,
    type ResyncOutcome,
  } from "@lib/local/resync-campus-data";
  import { syncToastStore } from "@lib/store.svelte";
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
  <h2 class="settings-modal__title">Settings</h2>
  <div class="settings-modal__scroll map-chrome-scroll">
    <section class="settings-modal__section">
      <h3>View</h3>
      <MapViewControls embedded variant="modes" />
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

      <div class="map-chrome-row">
        <span class="map-chrome-row__label">Cached app data</span>
        {#if !confirming}
          <div class="map-chrome-row__control">
            <button
              type="button"
              class="map-chrome-action-chip settings-modal__danger"
              aria-describedby="settings-storage-hint"
              onclick={() => (confirming = true)}
            >
              Clear cached data and reload
            </button>
          </div>
        {/if}
      </div>
      <p id="settings-storage-hint" class="map-chrome-row-hint">
        Clears the cached app, saved campus data, and downloaded offline maps,
        then reloads. Your saved class plans stay.
      </p>
      {#if confirming}
        <p
          id="settings-storage-warning"
          class="map-chrome-row-hint map-chrome-row-hint--warn"
        >
          Downloaded offline maps go too. You will need a connection to
          download them again.
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
            {clearing ? "Clearing…" : "Clear and reload"}
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
    gap: 0.625rem;
    padding: 0.5rem 0.5rem 0.25rem;
    flex: 1 1 auto;
    min-height: 0;
  }

  .settings-modal__title {
    margin: 0;
    padding-right: 2.25rem;
    font-size: 1rem;
    font-weight: 700;
    color: hsl(0, 0%, 15%);
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
    padding: 0 0.375rem 0 0.25rem;
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

  /* Groups the light fix with its own result line, so the heavier
     clear-and-reload below reads as the separate, bigger hammer. */
  .settings-modal__task {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding-bottom: 0.625rem;
    border-bottom: 1px solid hsl(0, 0%, 90%);
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
