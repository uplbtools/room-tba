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
    const width = Math.min(256, window.innerWidth - 16);
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

  const pct = $derived(Math.round(offlineStore.progress * 100));
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
    title="Download the campus map for offline use"
  >
    <DownloadCloud size={16} />
    {#if !compact}
      <span>Offline maps</span>
    {:else}
      <span class="sr-only">Offline maps</span>
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
      aria-label="Offline maps"
      use:portal
    >
      {#if offlineStore.status === "downloading"}
        <p class="map-chrome-popover-line">
          Downloading campus map… {pct}%
        </p>
        <div class="map-chrome-progress" aria-hidden="true">
          <div class="map-chrome-progress__value" style:width={`${pct}%`}></div>
        </div>
        <p class="map-chrome-popover-sub">
          {offlineStore.tilesDone} / {offlineStore.tilesTotal} tiles ·
          {fmtBytes(offlineStore.bytesDownloaded)}
        </p>
        <button class="offline-btn ghost" onclick={() => offlineStore.cancel()}>
          Cancel
        </button>
      {:else if offlineStore.status === "done"}
        <p class="map-chrome-popover-line">Campus map saved for offline use.</p>
        <p class="map-chrome-popover-sub">
          {offlineStore.tilesTotal} tiles · {fmtBytes(
            offlineStore.bytesDownloaded,
          )} downloaded
        </p>
        <button class="offline-btn ghost" onclick={() => offlineStore.clear()}>
          Clear offline maps
        </button>
      {:else}
        <p class="map-chrome-popover-line">
          Download the campus map for offline use.
        </p>
        <p class="map-chrome-popover-sub">
          Estimated download: ~{fmtBytes(offlineStore.estimatedBytes)}
          ({offlineStore.tilesTotal} tiles)
        </p>
        {#if offlineStore.status === "error" && offlineStore.error}
          <p class="offline-error">{offlineStore.error}</p>
        {/if}
        <button
          class="offline-btn"
          onclick={() => offlineStore.downloadCampus()}
        >
          Download offline maps
        </button>
      {/if}

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
  .offline-btn.ghost {
    background-color: white;
    color: hsl(5, 53%, 32%);
    border: 1px solid hsl(5, 53%, 75%);
  }
  .offline-btn.ghost:hover {
    background-color: hsl(5, 53%, 97%);
  }
</style>
