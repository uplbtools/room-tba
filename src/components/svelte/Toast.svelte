<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { onMount } from "svelte";
  import X from "@lucide/svelte/icons/x";
  import IconButton from "@ui/IconButton.svelte";

  let {
    message,
    type = "info",
    onclose,
  } = $props<{
    message: string;
    type?: "info" | "error" | "success";
    onclose: () => void;
  }>();

  onMount(() => {
    const timer = setTimeout(() => {
      onclose();
    }, 5000);
    return () => clearTimeout(timer);
  });
</script>

<div
  class="toast {type}"
  role="status"
  aria-live="polite"
  in:fly={{ y: 20, duration: 300 }}
  out:fade={{ duration: 200 }}
>
  <div class="icon">
    {#if type === "error"}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><circle cx="12" cy="12" r="10" /><line
          x1="12"
          y1="8"
          x2="12"
          y2="12"
        /><line x1="12" y1="16" x2="12.01" y2="16" /></svg
      >
    {:else if type === "success"}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg
      >
    {:else}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><circle cx="12" cy="12" r="10" /><line
          x1="12"
          y1="16"
          x2="12"
          y2="12"
        /><line x1="12" y1="8" x2="12.01" y2="8" /></svg
      >
    {/if}
  </div>
  <div class="message">{message}</div>
  <IconButton size="sm" class="toast-close" label="Close" onclick={onclose}>
    <X size={16} aria-hidden="true" />
  </IconButton>
</div>

<style>
  .toast {
    position: fixed;
    bottom: calc(
      var(--status-bar-block-height, 2.75rem) + var(--edit-bar-height, 0rem) +
        env(safe-area-inset-bottom) + 1rem
    );
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-toast, 1000);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background-color: white;
    border-radius: 0.75rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 280px;
    max-width: 90vw;
    pointer-events: auto;
  }

  .toast.error {
    color: #b91c1c;
  }

  .toast.info {
    color: #1e40af;
  }

  .toast.success {
    color: #065f46;
  }

  .icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .message {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 500;
  }

  /* Toast text color varies by type; keep the X on currentColor. */
  .toast :global(.toast-close) {
    color: currentColor;
    opacity: 0.6;
    transition: opacity 0.2s;
    display: flex;
    align-items: center;
  }

  .toast :global(.toast-close:hover) {
    opacity: 1;
  }

  @media (max-width: 48rem) {
    .toast {
      width: calc(100% - 2rem);
    }
  }
</style>
