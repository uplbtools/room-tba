<script lang="ts">
  import { LoaderCircle, RefreshCw } from "@lucide/svelte";
  import { appBootstrapStore } from "@lib/store.svelte";
  import { MediaQuery } from "svelte/reactivity";
  import "../../styles/app-loading.css";

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
              class={retrying && !reducedMotion.current
                ? "app-loading-spinner app-loading-spinner--spin"
                : "app-loading-spinner"}
              aria-hidden="true"
            />
            {retrying ? "Retrying…" : "Try again"}
          </button>
        {/if}
      {:else}
        <LoaderCircle
          size={22}
          class={reducedMotion.current
            ? "app-loading-spinner app-loading-spinner--static"
            : "app-loading-spinner app-loading-spinner--spin"}
          aria-hidden="true"
        />
        <p class="app-loading-overlay__message">{message}</p>
      {/if}
    </div>
  </div>
{/if}
