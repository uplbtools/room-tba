<script lang="ts">
  import { onMount } from "svelte";
  import DownloadCloud from "@lucide/svelte/icons/download-cloud";
  import { MediaQuery } from "svelte/reactivity";
  import { offlineStore } from "../../lib/store.svelte";

  let open = $state(false);
  const mobile = new MediaQuery("max-width:48rem");

  onMount(() => {
    offlineStore.prepareEstimate();
  });

  function fmtBytes(bytes: number | null): string {
    if (bytes == null) return "—";
    const mb = bytes / 1024 / 1024;
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  const pct = $derived(Math.round(offlineStore.progress * 100));
</script>

<div class="offline-maps" class:is-open={open} class:mobile={mobile.current}>
  <button
    class="offline-trigger"
    type="button"
    aria-expanded={open}
    onclick={() => (open = !open)}
    title="Download the campus map for offline use"
  >
    <DownloadCloud size={16} />
    <span>Offline maps</span>
  </button>

  {#if open}
    <div class="offline-popover" role="dialog" aria-label="Offline maps">
      {#if offlineStore.status === "downloading"}
        <p class="offline-line">
          Downloading campus map… {pct}%
        </p>
        <div class="offline-bar" aria-hidden="true">
          <div class="offline-bar__value" style:width={`${pct}%`}></div>
        </div>
        <p class="offline-sub">
          {offlineStore.tilesDone} / {offlineStore.tilesTotal} tiles ·
          {fmtBytes(offlineStore.bytesDownloaded)}
        </p>
        <button class="offline-btn ghost" onclick={() => offlineStore.cancel()}>
          Cancel
        </button>
      {:else if offlineStore.status === "done"}
        <p class="offline-line">Campus map saved for offline use.</p>
        <p class="offline-sub">
          {offlineStore.tilesTotal} tiles · {fmtBytes(
            offlineStore.bytesDownloaded,
          )} downloaded
        </p>
        <button class="offline-btn ghost" onclick={() => offlineStore.clear()}>
          Clear offline maps
        </button>
      {:else}
        <p class="offline-line">Download the campus map for offline use.</p>
        <p class="offline-sub">
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

      <p class="offline-storage">
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

  .offline-popover {
    position: absolute;
    bottom: calc(100% + 0.5rem);
    right: 0;
    z-index: 40;
    width: 16rem;
    max-width: min(16rem, calc(100vw - 1rem));
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    backdrop-filter: blur(10px);
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: 0.75rem;
    padding: 0.75rem;
    box-shadow: var(
      --map-chrome-panel-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.14),
      0 4px 14px hsla(0, 0%, 0%, 0.2),
      0 10px 28px hsla(0, 0%, 0%, 0.12)
    );
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    text-align: left;
    cursor: default;
  }

  /* Mobile: expand inline in the status bar — absolute popovers clip/off-screen */
  .offline-maps.mobile.is-open {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .offline-maps.mobile .offline-popover {
    position: static;
    width: 100%;
    max-width: none;
    margin-top: 0.375rem;
  }

  .offline-maps.mobile .offline-trigger {
    align-self: flex-start;
  }

  .offline-line {
    margin: 0;
    font-weight: 600;
    font-size: 0.8125rem;
    color: black;
  }
  .offline-sub {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 500;
    color: hsl(0, 0%, 40%);
  }
  .offline-error {
    margin: 0;
    font-size: 0.75rem;
    color: hsl(5, 53%, 38%);
  }

  .offline-bar {
    height: 0.5rem;
    border-radius: 0.5rem;
    background-color: #ddd;
    overflow: hidden;
  }
  .offline-bar__value {
    height: 100%;
    background-color: #7b1113;
    border-radius: 0.5rem;
    transition: width 0.2s ease;
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

  .offline-storage {
    margin: 0.125rem 0 0;
    padding-top: 0.375rem;
    border-top: 1px solid hsl(0, 0%, 92%);
    font-size: 0.6875rem;
    color: hsl(0, 0%, 55%);
  }
</style>
