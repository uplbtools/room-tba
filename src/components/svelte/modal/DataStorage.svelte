<script lang="ts">
  import Download from "@lucide/svelte/icons/download";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import OfflineMaps from "@ui/OfflineMaps.svelte";
  import SettingsRow from "./SettingsRow.svelte";
  import SettingsSection from "./SettingsSection.svelte";
  import { clearCachedData } from "@lib/local/clear-cached-data";
  import {
    resyncCampusData,
    type ResyncOutcome,
  } from "@lib/local/resync-campus-data";
  import { fmtBytes } from "@lib/local/offline-maps";
  import { offlineStore, syncToastStore } from "@lib/store.svelte";

  /**
   * Data & storage: offline downloads, resync and reset on one screen, so
   * everything that decides what lives on this device is in one place.
   * Rendered as its own screen (You, the offline maps modal) and as the
   * Data & storage section of Settings.
   */

  const anyDownloading = $derived(
    offlineStore.status === "downloading" ||
      offlineStore.directoryStatus === "downloading" ||
      offlineStore.schedulesStatus === "downloading",
  );
  const allSaved = $derived(
    offlineStore.status === "done" &&
      offlineStore.directoryLastSyncedAt !== null &&
      offlineStore.schedulesLastSyncedAt !== null,
  );
  const mapSize = $derived(
    offlineStore.estimatedBytes > 0 ? fmtBytes(offlineStore.estimatedBytes) : null,
  );

  function downloadEverything() {
    if (offlineStore.status !== "done") void offlineStore.downloadCampus();
    if (!offlineStore.directoryLastSyncedAt) {
      void offlineStore.downloadCampusDirectory();
    }
    if (!offlineStore.schedulesLastSyncedAt) {
      void offlineStore.downloadClassSchedules();
    }
  }

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

  // Opening the confirm swaps the row out from under the pointer, which
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

<SettingsSection variant="list" title="Offline maps">
  <p class="data-storage__note" id="offline-maps-data-note">
    Save campus data on this device for use without a connection. Best on
    Wi-Fi{mapSize
      ? `: the map alone uses about ${mapSize} of data.`
      : "; the map is the largest download."}
  </p>
  {#if !allSaved}
    <div class="data-storage__action">
      <button
        type="button"
        class="data-storage__primary"
        disabled={anyDownloading}
        aria-describedby="offline-maps-data-note"
        onclick={downloadEverything}
      >
        <Download size={18} aria-hidden="true" />
        {anyDownloading
          ? "Downloading…"
          : mapSize
            ? `Download everything (~${mapSize})`
            : "Download everything"}
      </button>
    </div>
  {/if}
  <div class="data-storage__offline">
    <OfflineMaps inline />
  </div>
</SettingsSection>

<SettingsSection variant="list" title="Data & storage">
  <SettingsRow
    icon={RefreshCw}
    label="Campus data"
    supporting="Fetches rooms and classes again. Your downloaded offline maps are kept."
    supportingId="settings-resync-hint"
  >
    {#snippet trailing()}
      <button
        type="button"
        class="data-storage__text-btn"
        aria-describedby="settings-resync-hint"
        disabled={resyncing}
        onclick={resync}
      >
        {resyncing ? "Resyncing…" : "Resync"}
      </button>
    {/snippet}
  </SettingsRow>
  {#if resyncResult}
    <p
      class="data-storage__status"
      class:data-storage__status--warn={resyncResult !== "synced"}
      role="status"
    >
      {RESYNC_MESSAGE[resyncResult]}
    </p>
  {/if}

  {#if !confirming}
    <SettingsRow
      icon={Trash2}
      label="Reset offline data"
      supporting="Removes saved campus data, offline maps, and cached app files. Your saved class plans stay."
      supportingId="settings-storage-hint"
      danger
      onclick={() => (confirming = true)}
    />
  {:else}
    <div class="data-storage__confirm" role="group" aria-label="Reset offline data">
      <p id="settings-storage-warning" class="data-storage__warning">
        Downloaded offline maps will be removed. You will need a connection to
        download them again.
      </p>
      <div class="data-storage__confirm-actions">
        <button
          type="button"
          class="data-storage__text-btn"
          disabled={clearing}
          onclick={() => (confirming = false)}
        >
          Cancel
        </button>
        <button
          type="button"
          class="data-storage__text-btn data-storage__text-btn--danger"
          aria-describedby="settings-storage-warning"
          disabled={clearing}
          bind:this={confirmButton}
          onclick={clearAndReload}
        >
          {clearing ? "Resetting…" : "Reset and reload"}
        </button>
      </div>
    </div>
  {/if}
</SettingsSection>

<style>
  .data-storage__note {
    margin: 0;
    padding: 0 1rem 0.5rem;
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .data-storage__action {
    padding: 0.25rem 1rem 0.5rem;
  }

  .data-storage__primary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.5rem;
    padding: 0 1.5rem 0 1rem;
    border: none;
    border-radius: 999px;
    background: var(--theme-accent-fill, hsl(345, 75%, 31%));
    color: #fff;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .data-storage__primary:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  .data-storage__offline {
    padding: 0 1rem;
  }

  /* The section label already says what this list is. */
  .data-storage__offline :global(.map-chrome-popover-line) {
    display: none;
  }

  .data-storage__primary:focus-visible,
  .data-storage__text-btn:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(345, 75%, 31%));
    outline-offset: 2px;
  }

  /* Material text button: 40px, no frame, brand colour. */
  .data-storage__text-btn {
    min-height: 2.5rem;
    padding: 0 0.75rem;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--theme-accent-text, hsl(345, 75%, 31%));
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  @media (hover: hover) {
    .data-storage__text-btn:hover:not(:disabled) {
      background: var(--theme-accent-soft, hsl(5, 25%, 95%));
    }
  }

  .data-storage__text-btn:disabled {
    opacity: 0.38;
    cursor: default;
  }

  .data-storage__text-btn--danger {
    color: var(--theme-danger-text, #b3261e);
  }

  .data-storage__status {
    margin: 0;
    padding: 0 1rem 0.5rem 4rem;
    font-size: 0.875rem;
    color: var(--theme-green-text, hsl(150, 50%, 26%));
  }

  .data-storage__status--warn {
    color: var(--theme-amber-text, hsl(30, 80%, 30%));
  }

  .data-storage__confirm {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0.25rem 1rem 0.5rem;
    padding: 0.75rem 0.75rem 0.5rem 1rem;
    border-radius: 0.75rem;
    background: var(--theme-accent-soft, hsl(0, 75%, 97%));
  }

  .data-storage__warning {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--theme-text, hsl(0, 0%, 15%));
  }

  .data-storage__confirm-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.5rem;
  }
</style>
