<script lang="ts">
  import { Building2, LoaderCircle, MapPin, RefreshCw, Trees } from "@lucide/svelte";
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
        <div class="app-loading-mark" aria-hidden="true">
          <div class="app-loading-mark__loader">
            <LoaderCircle
              size={28}
              class={reducedMotion.current
                ? "app-loading-spinner app-loading-spinner--static"
                : "app-loading-spinner app-loading-spinner--spin"}
            />
          </div>
          <div class="app-loading-mark__pin">
            <MapPin size={14} strokeWidth={2.25} />
          </div>
        </div>
        <div class="app-loading-mark__context" aria-hidden="true">
          <Building2 size={13} class="app-loading-mark__context-icon" />
          <MapPin size={13} class="app-loading-mark__context-icon" />
          <Trees size={13} class="app-loading-mark__context-icon" />
        </div>
        <p class="app-loading-overlay__message">{message}</p>
        <p class="app-loading-overlay__subtitle">Buildings, rooms &amp; events</p>
      {/if}
    </div>
  </div>
{/if}
