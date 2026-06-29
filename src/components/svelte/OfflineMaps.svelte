<script lang="ts">
  import { onMount } from "svelte";
  import DownloadCloud from "@lucide/svelte/icons/download-cloud";
  import { mapToolsStore, offlineStore } from "@lib/store.svelte";
  import { rafThrottle } from "@lib/layout-css-vars";
  import { trapFocus } from "@lib/focus-trap";
  import { portal } from "@lib/portal";
  import "./map-chrome/map-chrome.css";

  type Props = {
    /** Icon-only trigger for the mobile status strip. */
    compact?: boolean;
  };

  let { compact = false }: Props = $props();

  let open = $state(false);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let popoverEl = $state<HTMLDivElement | null>(null);
  let popoverStyle = $state("");

  onMount(() => {
    offlineStore.prepareEstimate();
  });

  function updatePopoverPosition() {
    if (!open || !triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const width = Math.min(288, window.innerWidth - 16);
    const right = Math.max(8, window.innerWidth - rect.right);
    const bottom = Math.max(8, window.innerHeight - rect.top + 8);
    popoverStyle = `right: ${right}px; bottom: ${bottom}px; width: ${width}px;`;
  }

  $effect(() => {
    if (!open) return;
    updatePopoverPosition();
    const handleLayout = rafThrottle(updatePopoverPosition);
    window.addEventListener("resize", handleLayout);
    window.addEventListener("scroll", handleLayout, true);
    return () => {
      window.removeEventListener("resize", handleLayout);
      window.removeEventListener("scroll", handleLayout, true);
    };
  });

  function toggleOpen() {
    if (!open) {
      mapToolsStore.close();
    }
    open = !open;
    if (open) {
      queueMicrotask(updatePopoverPosition);
    }
  }

  function closePopover() {
    open = false;
  }

  $effect(() => {
    if (!open || !popoverEl) return;
    return trapFocus(popoverEl, { onEscape: closePopover });
  });

  function handleDocumentPointerDown(event: PointerEvent) {
    if (!open) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (triggerEl?.contains(target)) return;
    if (popoverEl?.contains(target)) return;
    closePopover();
  }

  function fmtBytes(bytes: number | null): string {
    if (bytes == null) return "—";
    const mb = bytes / 1024 / 1024;
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  function fmtSyncedAt(iso: string | null): string {
    if (!iso) return "Not downloaded";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Downloaded";
    return `Updated ${date.toLocaleDateString()}`;
  }

  const mapPct = $derived(Math.round(offlineStore.progress * 100));
  const directoryPct = $derived(
    Math.round(offlineStore.directoryProgress * 100),
  );
</script>

<svelte:window onpointerdown={handleDocumentPointerDown} />

<div class="offline-maps" class:compact>
  <button
    bind:this={triggerEl}
    class="offline-trigger"
    type="button"
    aria-expanded={open}
    aria-haspopup="dialog"
    aria-controls="offline-maps-dialog"
    onclick={toggleOpen}
    title="Download campus data for offline use"
  >
    <DownloadCloud size={16} aria-hidden="true" />
    {#if !compact}
      <span>Offline</span>
    {:else}
      <span class="sr-only">Offline downloads</span>
    {/if}
  </button>

  {#if open}
    <div
      bind:this={popoverEl}
      id="offline-maps-dialog"
      class="map-chrome-popover offline-popover"
      style={popoverStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Offline downloads"
      use:portal
    >
      <p class="map-chrome-popover-line">Download for offline use</p>

      <section class="offline-category" aria-labelledby="offline-map-heading">
        <div class="offline-category__head">
          <h3 id="offline-map-heading" class="offline-category__title">
            Campus map
          </h3>
          <span class="offline-category__meta">
            ~{fmtBytes(offlineStore.estimatedBytes)}
          </span>
        </div>

        {#if offlineStore.status === "downloading"}
          <p class="map-chrome-popover-sub" role="status">
            Downloading map tiles… {mapPct}%
          </p>
          <div class="map-chrome-progress" aria-hidden="true">
            <div
              class="map-chrome-progress__value"
              style:width={`${mapPct}%`}
            ></div>
          </div>
          <button
            class="offline-btn ghost"
            onclick={() => offlineStore.cancel()}
          >
            Cancel map download
          </button>
        {:else if offlineStore.status === "done"}
          <p class="map-chrome-popover-sub">
            Saved · {offlineStore.tilesTotal} tiles · {fmtBytes(
              offlineStore.bytesDownloaded,
            )}
          </p>
          <button
            class="offline-btn ghost"
            onclick={() => offlineStore.clear()}
          >
            Clear map tiles
          </button>
        {:else}
          <p class="map-chrome-popover-sub">
            Map tiles for campus bounds ({offlineStore.tilesTotal} tiles).
          </p>
          {#if offlineStore.status === "error" && offlineStore.error}
            <p class="offline-error">{offlineStore.error}</p>
          {/if}
          <button
            class="offline-btn"
            onclick={() => offlineStore.downloadCampus()}
          >
            Download campus map
          </button>
        {/if}
      </section>

      <section
        class="offline-category"
        aria-labelledby="offline-directory-heading"
      >
        <div class="offline-category__head">
          <h3 id="offline-directory-heading" class="offline-category__title">
            Campus directory
          </h3>
          <span class="offline-category__meta">
            {fmtSyncedAt(offlineStore.directoryLastSyncedAt)}
          </span>
        </div>

        {#if offlineStore.directoryStatus === "downloading"}
          <p class="map-chrome-popover-sub" role="status">
            {offlineStore.directoryProgressLabel}
            {directoryPct}%
          </p>
          <div class="map-chrome-progress" aria-hidden="true">
            <div
              class="map-chrome-progress__value"
              style:width={`${directoryPct}%`}
            ></div>
          </div>
        {:else if offlineStore.directoryStatus === "done"}
          <p class="map-chrome-popover-sub">
            Buildings, rooms, and search aliases saved for offline search.
          </p>
          <button
            class="offline-btn ghost"
            onclick={() => offlineStore.downloadCampusDirectory()}
          >
            Update directory
          </button>
          <button
            class="offline-btn ghost"
            onclick={() => offlineStore.clearCampusDirectory()}
          >
            Mark as not downloaded
          </button>
        {:else}
          <p class="map-chrome-popover-sub">
            Buildings, colleges, divisions, dorms, rooms, and aliases.
          </p>
          {#if offlineStore.directoryStatus === "error" && offlineStore.directoryError}
            <p class="offline-error">{offlineStore.directoryError}</p>
          {/if}
          <button
            class="offline-btn"
            onclick={() => offlineStore.downloadCampusDirectory()}
          >
            Download campus directory
          </button>
        {/if}
      </section>

      <p class="map-chrome-popover-footnote">
        On this device: {fmtBytes(offlineStore.storageUsed)}
      </p>
    </div>
  {/if}
</div>

<style>
  .offline-maps {
    position: relative;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .offline-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: none;
    font: inherit;
    color: inherit;
    cursor: pointer;
    padding: 0.125rem 0.375rem;
    border-radius: 0.5rem;
    white-space: nowrap;
  }
  .offline-trigger:hover {
    background-color: hsla(0, 0%, 0%, 0.1);
  }
  .offline-trigger:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 2px;
  }

  .offline-maps.compact {
    flex: 0 0 auto;
  }

  .offline-maps.compact .offline-trigger {
    padding: 0.125rem;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .offline-popover {
    position: fixed;
    z-index: var(--z-chrome-popover, 17);
    border-radius: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .offline-category {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding-top: 0.25rem;
    border-top: 1px solid hsl(0, 0%, 88%);
  }

  .offline-category__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .offline-category__title {
    margin: 0;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 700;
  }

  .offline-category__meta {
    font-size: 0.6875rem;
    color: hsl(0, 0%, 40%);
    text-align: right;
  }

  .offline-error {
    margin: 0;
    font-size: 0.75rem;
    color: hsl(5, 53%, 38%);
  }

  .offline-btn {
    margin-top: 0.125rem;
    border: none;
    border-radius: 0.5rem;
    padding: 0.375rem 0.625rem;
    background-color: hsl(5, 53%, 32%);
    color: white;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
  }
  .offline-btn:hover {
    background-color: hsl(5, 53%, 40%);
  }
  .offline-btn:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 2px;
  }
  .offline-btn.ghost {
    background-color: white;
    color: hsl(5, 53%, 32%);
    border: 1px solid hsl(5, 53%, 75%);
  }
  .offline-btn.ghost:hover {
    background-color: hsl(5, 53%, 97%);
  }
</style>
