<script lang="ts">
  import { onMount } from "svelte";
  import DownloadCloud from "@lucide/svelte/icons/download-cloud";
  import Download from "@lucide/svelte/icons/download";
  import { mapToolsStore, offlineStore } from "@lib/store.svelte";
  import { registerEphemeralOverlayDismisser } from "@lib/overlay-stack";
  import { rafThrottle } from "@lib/layout-css-vars";
  import { trapFocus } from "@lib/focus-trap";
  import { portal } from "@lib/portal";
  import "./map-chrome/map-chrome.css";

  type Props = {
    /** Icon-only trigger for the mobile status strip. */
    compact?: boolean;
    /** Render the download sections directly (no trigger/popover) — used by
     * the offline-maps modal. */
    inline?: boolean;
  };

  let { compact = false, inline = false }: Props = $props();

  let open = $state(inline);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let popoverEl = $state<HTMLDivElement | null>(null);
  let popoverStyle = $state("");

  onMount(() => {
    offlineStore.prepareEstimate();
    const unregisterDismiss = registerEphemeralOverlayDismisser(() => {
      if (!inline) open = false;
    });
    return unregisterDismiss;
  });

  function updatePopoverPosition() {
    if (inline || !open || !triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const width = Math.min(288, window.innerWidth - 16);
    // Anchor to the trigger's right edge, but never let the left edge overflow
    // the viewport (happens when the trigger sits left / on narrow screens).
    const maxRight = window.innerWidth - width - 8;
    const right = Math.min(Math.max(8, window.innerWidth - rect.right), maxRight);
    const bottom = Math.max(8, window.innerHeight - rect.top + 8);
    popoverStyle = `right: ${right}px; bottom: ${bottom}px; width: ${width}px;`;
  }

  $effect(() => {
    if (inline || !open) return;
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
    if (inline) return;
    if (!open) {
      // Open directly rather than via openEphemeralOverlay: this popover is
      // nested inside the App menu, and dismissing all ephemeral overlays would
      // also close the App menu (its dismisser), unmounting this popover before
      // it renders. Outside-click + Escape are handled locally below.
      mapToolsStore.close();
      open = true;
      queueMicrotask(updatePopoverPosition);
      return;
    }
    open = false;
  }

  function closePopover() {
    open = false;
  }

  $effect(() => {
    if (inline || !open || !popoverEl) return;
    return trapFocus(popoverEl, { onEscape: closePopover });
  });

  function handleDocumentPointerDown(event: PointerEvent) {
    if (inline || !open) return;
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

  function portalWhenFloating(node: HTMLElement) {
    return inline ? undefined : portal(node);
  }
</script>

<svelte:window onpointerdown={handleDocumentPointerDown} />

<div class="offline-maps" class:compact class:offline-maps--inline={inline}>
  {#if !inline}
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
  {/if}

  {#if open}
    <div
      bind:this={popoverEl}
      id="offline-maps-dialog"
      class="map-chrome-popover offline-popover"
      class:offline-popover--inline={inline}
      style={inline ? undefined : popoverStyle}
      role={inline ? undefined : "dialog"}
      aria-modal={inline ? undefined : true}
      aria-label="Offline downloads"
      use:portalWhenFloating
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
            <Download size={14} aria-hidden="true" />
            <span>Download campus map</span>
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
            Buildings, rooms, dorms, colleges, divisions, orgs &amp; offices,
            landmarks &amp; establishments, and events saved for offline
            search.
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
            Buildings, rooms, dorms, colleges, divisions, orgs &amp; offices,
            landmarks &amp; establishments, and events.
          </p>
          {#if offlineStore.directoryStatus === "error" && offlineStore.directoryError}
            <p class="offline-error">{offlineStore.directoryError}</p>
          {/if}
          <button
            class="offline-btn"
            onclick={() => offlineStore.downloadCampusDirectory()}
          >
            <Download size={14} aria-hidden="true" />
            <span>Download campus directory</span>
          </button>
        {/if}
      </section>

      <section
        class="offline-category"
        aria-labelledby="offline-schedules-heading"
      >
        <div class="offline-category__head">
          <h3 id="offline-schedules-heading" class="offline-category__title">
            Class schedules
          </h3>
          <span class="offline-category__meta">
            {fmtSyncedAt(offlineStore.schedulesLastSyncedAt)}
          </span>
        </div>

        {#if offlineStore.schedulesStatus === "downloading"}
          <p class="map-chrome-popover-sub" role="status">
            {offlineStore.schedulesProgressLabel}
          </p>
        {:else if offlineStore.schedulesStatus === "done"}
          <p class="map-chrome-popover-sub">
            {offlineStore.schedulesRowCount} classes saved for offline browse.
          </p>
          <button
            class="offline-btn ghost"
            onclick={() => offlineStore.downloadClassSchedules()}
          >
            Update schedules
          </button>
          <button
            class="offline-btn ghost"
            onclick={() => offlineStore.clearClassSchedules()}
          >
            Mark as not downloaded
          </button>
        {:else}
          <p class="map-chrome-popover-sub">
            Active-term class list for offline class search.
          </p>
          {#if offlineStore.schedulesStatus === "error" && offlineStore.schedulesError}
            <p class="offline-error">{offlineStore.schedulesError}</p>
          {/if}
          <button
            class="offline-btn"
            onclick={() => offlineStore.downloadClassSchedules()}
          >
            <Download size={14} aria-hidden="true" />
            <span>Download class schedules</span>
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
    outline-offset: -2px; /* status-bar badges row clips outward rings */
  }

  .offline-maps.compact {
    flex: 0 0 auto;
  }

  .offline-maps.compact .offline-trigger {
    padding: 0.125rem;
  }

  .offline-maps--inline {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
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

  .offline-popover--inline {
    position: static;
    width: 100%;
    box-sizing: border-box;
    max-height: none;
    flex: 0 0 auto;
    padding: 0;
    border: none;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
  }

  .offline-popover--inline .offline-category:first-of-type {
    border-top: none;
    padding-top: 0;
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
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    align-self: flex-start;
    gap: 0.375rem;
    width: auto;
    max-width: 100%;
    margin-top: 0.125rem;
    border: none;
    border-radius: 0.5rem;
    padding: 0.4375rem 0.75rem;
    background-color: hsl(5, 53%, 32%);
    color: white;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.2;
    cursor: pointer;
    white-space: nowrap;
  }

  .offline-btn :global(svg) {
    flex-shrink: 0;
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
