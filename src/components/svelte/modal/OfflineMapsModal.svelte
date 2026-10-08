<script lang="ts">
  import Download from "@lucide/svelte/icons/download";
  import OfflineMaps from "@ui/OfflineMaps.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import { offlineStore } from "@lib/store.svelte";
  import { fmtBytes } from "@lib/local/offline-maps";

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
</script>

<section class="offline-maps-modal">
  <ModalHeader
    id="offline-maps-modal-title"
    title="Offline maps"
    description="Save campus data on this device for use without a connection."
  >
    {#snippet actions()}
      {#if !allSaved}
        <button
          type="button"
          class="offline-maps-modal__all"
          disabled={anyDownloading}
          aria-describedby="offline-maps-data-note"
          onclick={downloadEverything}
        >
          <Download size={16} aria-hidden="true" />
          {anyDownloading
            ? "Downloading…"
            : mapSize
              ? `Download everything (~${mapSize})`
              : "Download everything"}
        </button>
      {/if}
      <p id="offline-maps-data-note" class="offline-maps-modal__note">
        Best on Wi-Fi{mapSize
          ? `: the map alone uses about ${mapSize} of data.`
          : "; the map is the largest download."}
      </p>
    {/snippet}
  </ModalHeader>
  <div class="offline-maps-modal__scroll map-chrome-scroll">
    <OfflineMaps inline />
  </div>
</section>

<style>
  .offline-maps-modal {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 0.25rem;
  }

  .offline-maps-modal__all {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.75rem;
    padding: 0 0.875rem;
    border: none;
    border-radius: 0.625rem;
    background: var(--theme-accent-fill, hsl(5, 53%, 32%));
    color: white;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 700;
    cursor: pointer;
  }

  .offline-maps-modal__all:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  .offline-maps-modal__all:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: 2px;
  }

  .offline-maps-modal__note {
    flex-basis: 100%;
    margin: 0;
    font-size: 0.75rem;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .offline-maps-modal__scroll {
    min-height: 0;
    overflow-y: auto;
    padding: 0.25rem 0.5rem;
  }
</style>
