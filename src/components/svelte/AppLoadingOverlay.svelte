<script lang="ts">
  import {
    Building2,
    LoaderCircle,
    MapPin,
    RefreshCw,
    Trees,
  } from "@lucide/svelte";
  import {
    LOADING_SPLASH_FIRST,
    LOADING_SPLASH_INTERVAL_MS,
    LOADING_SPLASH_MESSAGES,
  } from "@lib/loading-splash-messages";
  import { appBootstrapStore } from "@lib/store.svelte";
  import { MediaQuery } from "svelte/reactivity";
  import "../../styles/app-loading.css";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  const showOverlay = $derived(
    appBootstrapStore.phase === "local" ||
      (appBootstrapStore.phase === "remote" &&
        !appBootstrapStore.hasCachedData) ||
      (appBootstrapStore.phase === "error" && !appBootstrapStore.hasCachedData),
  );
  const isError = $derived(appBootstrapStore.phase === "error");
  const message = $derived(
    appBootstrapStore.statusLabel ?? "Loading campus data",
  );
  let retrying = $state(false);
  let splashIndex = $state(0);

  const splashMessage = $derived(
    reducedMotion.current
      ? LOADING_SPLASH_FIRST
      : LOADING_SPLASH_MESSAGES[splashIndex],
  );

  $effect(() => {
    if (isError || !showOverlay || reducedMotion.current) return;

    splashIndex = 0;
    let index = 0;
    const id = setInterval(() => {
      index = (index + 1) % LOADING_SPLASH_MESSAGES.length;
      splashIndex = index;
    }, LOADING_SPLASH_INTERVAL_MS);

    return () => clearInterval(id);
  });

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
        <div class="app-loading-mark-group" aria-hidden="true">
          <div class="app-loading-mark">
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
          <div class="app-loading-mark__context">
            <Building2 size={13} class="app-loading-mark__context-icon" />
            <MapPin size={13} class="app-loading-mark__context-icon" />
            <Trees size={13} class="app-loading-mark__context-icon" />
          </div>
        </div>
        <p class="app-loading-overlay__message">{message}</p>
        <p class="app-loading-overlay__splash" aria-hidden="true">
          {#key splashIndex}
            <span
              class="app-loading-overlay__splash-text"
              class:app-loading-overlay__splash-text--animate={!reducedMotion.current}
            >
              {splashMessage}
            </span>
          {/key}
        </p>
      {/if}
    </div>
  </div>
{/if}
