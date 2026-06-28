<script lang="ts">
  import { LoaderCircle, RefreshCw } from "@lucide/svelte";
  import { appBootstrapStore } from "@lib/store.svelte";
  import { MediaQuery } from "svelte/reactivity";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  const showOverlay = $derived(appBootstrapStore.showBlockingOverlay);
  const isError = $derived(appBootstrapStore.phase === "error");
  const message = $derived(appBootstrapStore.statusLabel ?? "Loading campus data…");
  let retrying = $state(false);

  async function handleRetry() {
    retrying = true;
    try {
      appBootstrapStore.retry();
    } finally {
      retrying = false;
    }
  }
</script>

{#if showOverlay}
  <div
    class="app-loading-overlay"
    role={isError ? "alert" : "status"}
    aria-live="polite"
    aria-busy={!isError}
  >
    <div class="app-loading-overlay__card">
      {#if isError}
        <p class="app-loading-overlay__message">{message}</p>
        {#if appBootstrapStore.canRetry}
          <button
            type="button"
            class="app-loading-overlay__retry"
            onclick={handleRetry}
            disabled={retrying}
          >
            <RefreshCw
              size={14}
              class={retrying && !reducedMotion.current ? "loading-icon" : ""}
              aria-hidden="true"
            />
            {retrying ? "Retrying…" : "Try again"}
          </button>
        {/if}
      {:else}
        <LoaderCircle
          size={22}
          class={reducedMotion.current ? "loading-icon--static" : "loading-icon"}
          aria-hidden="true"
        />
        <p class="app-loading-overlay__message">{message}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .app-loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 25;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    pointer-events: auto;
    background: hsla(5, 22%, 96%, 0.88);
    backdrop-filter: blur(6px);
  }

  .app-loading-overlay__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.625rem;
    width: min(18rem, calc(100% - 2rem));
    padding: 1rem 1.125rem;
    border: 1.5px solid var(--map-chrome-border, hsl(5, 10%, 68%));
    border-radius: var(--map-chrome-radius, 1rem);
    background: var(--map-chrome-surface, hsl(5, 20%, 97%));
    box-shadow: var(
      --map-chrome-panel-shadow,
      0 0 0 1px hsla(15, 8%, 20%, 0.16),
      0 2px 8px hsla(0, 0%, 0%, 0.14),
      0 8px 20px hsla(0, 0%, 0%, 0.18)
    );
    color: hsl(0, 0%, 18%);
    text-align: center;
  }

  .app-loading-overlay__message {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.35;
  }

  .app-loading-overlay__retry {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    min-height: 2rem;
    padding: 0.375rem 0.875rem;
    border: none;
    border-radius: 0.625rem;
    background-color: hsl(5, 53%, 32%);
    color: white;
    cursor: pointer;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .app-loading-overlay__retry:hover:not(:disabled) {
    background-color: hsl(5, 53%, 38%);
  }

  .app-loading-overlay__retry:disabled {
    cursor: progress;
    opacity: 0.75;
  }

  :global(.loading-icon) {
    animation: app-loading-spin 0.75s linear infinite;
    flex-shrink: 0;
    color: hsl(5, 53%, 32%);
  }

  :global(.loading-icon--static) {
    flex-shrink: 0;
    color: hsl(5, 53%, 32%);
    opacity: 0.85;
  }

  @keyframes app-loading-spin {
    from {
      rotate: 0deg;
    }
    to {
      rotate: 360deg;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.loading-icon) {
      animation: none;
      opacity: 0.85;
    }
  }
</style>
