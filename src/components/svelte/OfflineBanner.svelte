<script lang="ts">
  import WifiOff from "@lucide/svelte/icons/wifi-off";
  import X from "@lucide/svelte/icons/x";
  import { onlineStatus } from "@lib/stores/online-status.svelte";

  type Props = {
    /** "map" floats under the search chrome; "screen" sits above the bottom
     * nav so it never covers a full-screen header (Planner, Today…). */
    placement?: "map" | "screen";
  };

  const { placement = "map" }: Props = $props();

  // Dismissing hides it for this offline stretch only: it comes back the next
  // time the connection drops, and on every reload while still offline.
  let dismissed = $state(false);

  $effect(() => {
    if (onlineStatus.online) dismissed = false;
  });
</script>

{#if !onlineStatus.online && !dismissed}
  <div
    class="offline-banner"
    class:offline-banner--screen={placement === "screen"}
    role="status"
    aria-live="polite"
  >
    <WifiOff size={16} aria-hidden="true" />
    <span class="offline-banner__text">You’re offline — showing saved data</span>
    <button
      type="button"
      class="offline-banner__close"
      aria-label="Dismiss offline notice"
      title="Dismiss"
      onclick={() => (dismissed = true)}
    >
      <X size={16} aria-hidden="true" />
    </button>
  </div>
{/if}

<style>
  .offline-banner {
    position: fixed;
    left: 50%;
    top: calc(
      var(--staging-banner-height, 0px) + var(--staging-banner-gap, 0.5rem) +
        var(--search-block-height, 3.25rem) + 0.5rem
    );
    z-index: 19;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-sizing: border-box;
    width: max-content;
    max-width: calc(100vw - 2rem);
    padding: 0.375rem 0.375rem 0.375rem 0.75rem;
    transform: translateX(-50%);
    border-radius: 999px;
    background: hsl(220, 14%, 18%);
    color: white;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.3;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  }

  .offline-banner--screen {
    top: auto;
    bottom: calc(var(--mobile-bottom-nav-height, 0px) + 0.75rem);
  }

  .offline-banner__text {
    min-width: 0;
  }

  .offline-banner__close {
    all: unset;
    display: grid;
    flex-shrink: 0;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 999px;
    cursor: pointer;
  }

  .offline-banner__close:hover {
    background: hsla(0, 0%, 100%, 0.15);
  }

  .offline-banner__close:focus-visible {
    outline: 2px solid white;
    outline-offset: 1px;
  }
</style>
