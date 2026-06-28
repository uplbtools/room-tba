<script lang="ts">
  import { RefreshCw } from "@lucide/svelte";
  import { appBootstrapStore } from "@lib/store.svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { fade } from "svelte/transition";
  import "../../styles/app-loading.css";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  const showOverlay = $derived(appBootstrapStore.showBlockingOverlay);
  const isError = $derived(appBootstrapStore.phase === "error");
  const message = $derived(appBootstrapStore.statusLabel ?? "Loading campus data…");
  const subtitle = $derived.by(() => {
    switch (appBootstrapStore.phase) {
      case "local":
        return "Reading saved map from this device…";
      case "remote":
        return "Fetching buildings, rooms, and events…";
      default:
        return null;
    }
  });
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
      <p class="app-loading-overlay__eyebrow">UPLB Campus Map</p>

      {#if isError}
        <div class="app-loading-overlay__scene" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle
              cx="32"
              cy="36"
              r="22"
              stroke="hsl(5, 20%, 78%)"
              stroke-width="2"
              stroke-dasharray="4 6"
              opacity="0.7"
            />
            <path
              d="M32 14C26.5 14 22.5 18 22.5 24C22.5 31.5 32 46 32 46C32 46 41.5 31.5 41.5 24C41.5 18 37.5 14 32 14Z"
              fill="hsl(5, 53%, 32%)"
              stroke="white"
              stroke-width="2"
              opacity="0.55"
            />
            <path
              d="M24 44L40 28M40 44L24 28"
              stroke="hsl(5, 53%, 32%)"
              stroke-width="2.5"
              stroke-linecap="round"
            />
          </svg>
        </div>
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
                ? "app-loading-retry-icon app-loading-retry-icon--spin"
                : "app-loading-retry-icon"}
              aria-hidden="true"
            />
            {retrying ? "Retrying…" : "Try again"}
          </button>
        {/if}
      {:else}
        <div class="app-loading-overlay__scene" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g opacity="0.22" stroke="hsl(5, 12%, 58%)" stroke-width="1">
              <line x1="32" y1="10" x2="32" y2="54" />
              <line x1="10" y1="36" x2="54" y2="36" />
            </g>
            <circle
              class={reducedMotion.current ? undefined : "app-loading-scene__arc"}
              cx="32"
              cy="36"
              r="22"
              stroke="hsl(5, 53%, 32%)"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-dasharray="34 104"
              fill="none"
            />
            <path
              d="M32 15C27 15 23.5 18.5 23.5 23.5C23.5 30.5 32 44 32 44C32 44 40.5 30.5 40.5 23.5C40.5 18.5 37 15 32 15Z"
              fill="hsl(5, 53%, 32%)"
              stroke="white"
              stroke-width="2"
            />
            <path d="M28.5 19.5H35.5V25.5H28.5V19.5Z" fill="white" />
            <path d="M27.5 19.5L32 15.5L36.5 19.5H27.5Z" fill="white" />
          </svg>
        </div>

        {#key message}
          <p class="app-loading-overlay__message" in:fade={{ duration: reducedMotion.current ? 0 : 220 }}>
            {message}
          </p>
        {/key}
        {#if subtitle}
          {#key subtitle}
            <p
              class="app-loading-overlay__subtitle"
              in:fade={{ duration: reducedMotion.current ? 0 : 220, delay: reducedMotion.current ? 0 : 60 }}
            >
              {subtitle}
            </p>
          {/key}
        {/if}
      {/if}
    </div>
  </div>
{/if}
