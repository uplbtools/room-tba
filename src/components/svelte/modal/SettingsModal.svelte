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
        <p class="settings-modal__hint">
          Rooms or classes look stale or wrong? Fetch campus data again from
          the server. Your downloaded offline maps are kept.
        </p>
        <div class="settings-modal__actions">
          <button
            type="button"
            class="settings-modal__btn"
            disabled={resyncing}
            onclick={resync}
          >
            {resyncing ? "Resyncing…" : "Resync campus data"}
          </button>
        </div>
        {#if resyncResult}
          <p
            class="settings-modal__hint"
            class:settings-modal__hint--warn={resyncResult !== "synced"}
            class:settings-modal__hint--ok={resyncResult === "synced"}
            role="status"
          >
            {RESYNC_MESSAGE[resyncResult]}
          </p>
        {/if}
      </div>

      <p class="settings-modal__hint">
        Still broken? This is the heavier fix: it clears the cached app, saved
        campus data, and downloaded offline maps, then reloads. Your saved
        class plans stay.
      </p>
      {#if confirming}
        <p
          id="settings-storage-warning"
          class="settings-modal__hint settings-modal__hint--warn"
        >
          Downloaded offline maps go too — you will need to download them again
          on a connection.
        </p>
        <div class="settings-modal__actions">
          <button
            type="button"
            class="settings-modal__btn settings-modal__btn--danger"
            aria-describedby="settings-storage-warning"
            disabled={clearing}
            bind:this={confirmButton}
            onclick={clearAndReload}
          >
            {clearing ? "Clearing…" : "Clear and reload"}
          </button>
          <button
            type="button"
            class="settings-modal__btn"
            disabled={clearing}
            onclick={() => (confirming = false)}
          >
            Cancel
          </button>
        </div>
      {:else}
        <div class="settings-modal__actions">
          <button
            type="button"
            class="settings-modal__btn"
            onclick={() => (confirming = true)}
          >
            Clear cached data and reload
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

  .settings-modal__hint {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.35;
    color: hsl(0, 0%, 40%);
  }

  .settings-modal__hint--warn {
    color: hsl(5, 53%, 32%);
  }

  .settings-modal__hint--ok {
    color: hsl(150, 40%, 28%);
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

  .settings-modal__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-top: 0.125rem;
  }

  .settings-modal__btn {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    /* 44px touch target. */
    min-height: 2.75rem;
    border: 1px solid hsl(0, 0%, 82%);
    border-radius: 0.5rem;
    padding: 0.4375rem 0.75rem;
    background-color: white;
    color: hsl(0, 0%, 20%);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.2;
    cursor: pointer;
  }

  .settings-modal__btn:hover:not(:disabled) {
    background-color: hsl(0, 0%, 96%);
  }

  .settings-modal__btn:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 2px;
  }

  .settings-modal__btn:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .settings-modal__btn--danger {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 32%);
    color: white;
  }

  .settings-modal__btn--danger:hover:not(:disabled) {
    background-color: hsl(5, 53%, 27%);
  }
</style>
