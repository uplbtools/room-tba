<script lang="ts">
  import Copy from "@lucide/svelte/icons/copy";
  import { onDestroy } from "svelte";
  import { copyTextToClipboard } from "@lib/clipboard";
  import MapChromeActionChip from "@ui/map-chrome/MapChromeActionChip.svelte";

  type FeedbackMode = "inline" | "none";

  let {
    url,
    label = "Copy link",
    ariaLabel = label,
    successMessage = "Link copied.",
    errorMessage = "Could not copy link.",
    feedback = "none",
    block = false,
    toolbar = false,
    onsuccess,
    onerror,
  } = $props<{
    url: string;
    label?: string;
    ariaLabel?: string;
    successMessage?: string;
    errorMessage?: string;
    feedback?: FeedbackMode;
    /** Stretch to full container width (SEO index rows on narrow screens). */
    block?: boolean;
    /** Match entity header / list card toolbar chip styling. */
    toolbar?: boolean;
    onsuccess?: () => void;
    onerror?: () => void;
  }>();

  let statusMessage = $state("");
  let copying = $state(false);
  let statusTimer: ReturnType<typeof setTimeout> | null = null;

  onDestroy(() => {
    if (statusTimer) {
      clearTimeout(statusTimer);
    }
  });

  function showInlineStatus(message: string) {
    if (feedback !== "inline") return;

    statusMessage = message;

    if (statusTimer) {
      clearTimeout(statusTimer);
    }

    statusTimer = setTimeout(() => {
      statusMessage = "";
      statusTimer = null;
    }, 2500);
  }

  async function handleCopy() {
    if (copying) return;

    copying = true;
    try {
      await copyTextToClipboard(url);
      onsuccess?.();
      showInlineStatus(successMessage);
    } catch {
      onerror?.();
      showInlineStatus(errorMessage);
    } finally {
      copying = false;
    }
  }
</script>

<span class="copy-link-wrapper" class:copy-link-wrapper--block={block}>
  <MapChromeActionChip
    onclick={handleCopy}
    disabled={copying}
    {toolbar}
    {ariaLabel}
    ariaBusy={copying}
    title={ariaLabel}
  >
    <Copy size={14} aria-hidden="true" />
    {label}
  </MapChromeActionChip>
  {#if feedback === "inline"}
    <span class="copy-link-status" role="status" aria-live="polite">
      {statusMessage}
    </span>
  {/if}
</span>

<style>
  .copy-link-wrapper {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .copy-link-wrapper--block {
    display: flex;
    width: 100%;
  }

  .copy-link-wrapper--block :global(.map-chrome-action-chip) {
    width: 100%;
  }

  .copy-link-status {
    min-width: 4.5rem;
    color: #065f46;
    font-size: 0.8125rem;
    font-weight: 500;
  }
</style>
