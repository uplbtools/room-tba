<script lang="ts">
  import Copy from "@lucide/svelte/icons/copy";
  import { onDestroy } from "svelte";
  import { copyTextToClipboard } from "../../lib/clipboard";

  type FeedbackMode = "inline" | "none";
  type Variant = "index" | "chip";

  let {
    url,
    label = "Copy link",
    ariaLabel = label,
    successMessage = "Link copied.",
    errorMessage = "Could not copy link.",
    feedback = "inline",
    variant = "index",
    onsuccess,
    onerror,
  } = $props<{
    url: string;
    label?: string;
    ariaLabel?: string;
    successMessage?: string;
    errorMessage?: string;
    feedback?: FeedbackMode;
    variant?: Variant;
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

<span class="copy-link-wrapper" data-variant={variant}>
  <button
    type="button"
    class="copy-link-btn"
    aria-label={ariaLabel}
    aria-busy={copying}
    title={ariaLabel}
    disabled={copying}
    onclick={handleCopy}
  >
    <span>{label}</span>
    <Copy size={16} aria-hidden="true" />
  </button>
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
    flex-wrap: wrap;
  }

  .copy-link-btn {
    display: inline-flex;
    min-height: 2rem;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    border-radius: 0.5rem;
    border: 1px solid #d8b9ba;
    background-color: white;
    color: #7b1113;
    font-size: 0.875rem;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    white-space: nowrap;
    transition:
      background-color 0.2s,
      border-color 0.2s,
      color 0.2s,
      opacity 0.2s;
  }

  .copy-link-btn:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  .copy-link-btn:focus-visible {
    outline: 3px solid rgba(123, 17, 19, 0.25);
    outline-offset: 2px;
  }

  .copy-link-btn :global(svg) {
    flex: 0 0 auto;
  }

  [data-variant="chip"] .copy-link-btn {
    width: max-content;
    padding: 0.375rem 0.75rem;
  }

  [data-variant="chip"] .copy-link-btn:hover:not(:disabled) {
    border-color: #c58f91;
    background-color: #fdf3f3;
  }

  [data-variant="index"] .copy-link-btn {
    padding: 0.35rem 0.625rem;
  }

  [data-variant="index"] .copy-link-btn:hover:not(:disabled) {
    border-color: #c58f91;
    background-color: #fdf3f3;
  }

  .copy-link-status {
    min-width: 4.5rem;
    color: #065f46;
    font-size: 0.8125rem;
    font-weight: 500;
  }

  @media (max-width: 640px) {
    .copy-link-wrapper,
    .copy-link-btn {
      width: 100%;
    }
  }
</style>
