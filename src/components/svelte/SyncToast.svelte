<script lang="ts">
  import {
    CircleCheckBig,
    Info,
    LoaderCircle,
    RefreshCw,
    TriangleAlert,
    X,
  } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { registerSW } from "virtual:pwa-register";
  import { syncToastStore } from "@lib/store.svelte";
  import { fly } from "svelte/transition";

  type Props = {
    /** When true, toast flows in the map-controls stack instead of fixed. */
    stacked?: boolean;
  };

  let { stacked = false }: Props = $props();

  let manualClosed = $state<boolean>(false);
  let reloading = $state<boolean>(false);

  // Register the service worker and route its "new content available" prompt
  // into this offline toast instead of a separate floating element.
  onMount(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        syncToastStore.markNeedRefresh();
      },
      onRegisteredSW(swScriptUrl) {
        console.log("SW registered: ", swScriptUrl);
      },
    });
    syncToastStore.setRefreshHandler(() => {
      reloading = true;
      void updateSW(true);
    });
  });
  const progressPercent = $derived.by(() => {
    const syncData = syncToastStore.currentSyncData;
    if (!syncData || syncData.total <= 0) return 0;
    return Math.floor((syncData.synced / syncData.total) * 5) * 20;
  });
  const manualCloseResetKey = $derived(
    `${syncToastStore.recentlySynced}:${syncToastStore.allSynced}:${syncToastStore.currentSync}`,
  );

  $effect(() => {
    if (manualCloseResetKey) {
      manualClosed = false;
    }
  });
  $effect(() => {
    let timeout: number | null = null;
    if (syncToastStore.allSynced) {
      timeout = setTimeout(() => {
        manualClosed = true;
      }, 3000);
    }
    return () => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
    };
  });
</script>

{#snippet icon(type: "warning" | "success" | "info" | "loading")}
  {#if type === "info"}
    <Info color="#000" />
  {:else if type === "success"}
    <CircleCheckBig color="hsla(133, 100%, 13%, 1)" />
  {:else if type === "warning"}
    <TriangleAlert color="hsla(54, 100%, 18%, 1)" />
  {:else}
    <LoaderCircle color="#000" class="loading-icon" />
  {/if}
{/snippet}

{#if syncToastStore.needRefresh}
  <div
    class="sync-toast sync-toast--update"
    class:sync-toast--stacked={stacked}
    role="status"
    aria-live="polite"
    transition:fly={{ duration: 175, y: 20 }}
  >
    {@render icon("info")}
    <div class="sync-toast-content">
      <div class="sync-toast-text">
        <div class="sync-toast-header">New version available</div>
        <div class="sync-toast-subtitle">Reload to get the latest updates.</div>
      </div>
      <button
        class="reload-button"
        onclick={() => syncToastStore.reload()}
        disabled={reloading}
      >
        <RefreshCw size={16} class={reloading ? "loading-icon" : ""} />
        {reloading ? "Reloading..." : "Reload"}
      </button>
    </div>
    <button
      onclick={() => syncToastStore.dismissRefresh()}
      aria-label="Dismiss update notice"
    >
      <X />
    </button>
  </div>
{/if}

{#key syncToastStore.currentSync}
  {#if (syncToastStore.recentlySynced === null || syncToastStore.recentlySynced) && !manualClosed && !syncToastStore.needRefresh}
    <div
      class="sync-toast"
      class:sync-toast--stacked={stacked}
      class:sync-toast--success={syncToastStore.allSynced}
      role="status"
      aria-live="polite"
      transition:fly={{ duration: 175, y: 20 }}
    >
      {#if syncToastStore.allSynced}
        {@render icon("success")}
      {:else if syncToastStore.currentSync === null}
        {@render icon("loading")}
      {:else}
        {@render icon("info")}
      {/if}
      <div class="sync-toast-content">
        <div class="sync-toast-text">
          <div class="sync-toast-header">
            {#if syncToastStore.allSynced}
              Data successfully synced
            {:else if syncToastStore.currentSync === null}
              Checking if data needs syncing
            {:else}
              Syncing {syncToastStore.currentSync} to device
            {/if}
          </div>
          <div class="sync-toast-subtitle">
            {#if syncToastStore.allSynced}
              Room TBA can now work offline
            {:else if syncToastStore.currentSync !== null && syncToastStore.currentSyncData !== null}
              {#key syncToastStore.currentSync}
                {progressPercent}%
              {/key}
            {/if}
          </div>
        </div>
        {#key syncToastStore.currentSync}
          {#if !syncToastStore.allSynced && syncToastStore.currentSyncData !== null}
            <div class="progress-bar">
              <!--  -->
              <div
                class="progress-bar-value"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={progressPercent}
                aria-label={`Syncing ${syncToastStore.currentSync} data`}
                style:width={`${progressPercent}%`}
              ></div>
            </div>
          {/if}
        {/key}
      </div>
      <button
        onclick={() => (manualClosed = true)}
        aria-label="Dismiss sync status"
      >
        <X />
      </button>
    </div>
  {/if}
{/key}

<style>
  div.sync-toast {
    position: fixed;
    padding: 0.75rem;
    background-color: white;
    border-radius: var(--radius-lg, 12px);
    z-index: 30;
    left: 50%;
    bottom: 5rem;
    display: flex;
    gap: 0.5rem;
    translate: -50% 0;
    width: min(300px, 100%);
    align-items: center;
    .sync-toast-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 0.5rem;
    }
    .sync-toast-header {
      font-size: 14px;
      font-weight: bold;
    }
    .sync-toast-subtitle {
      display: none;
    }
    button {
      display: flex;
      align-items: center;
      margin-left: auto;
      height: min-content;
    }
  }

  div.sync-toast--success {
    border: 1px solid var(--Color-success-200, #c6fbd2);
    background: var(--Color-success-100, #e5ffeb);
    .sync-toast-header {
      color: var(--Color-success-900, #00430f);
    }
    .sync-toast-subtitle {
      color: var(--Color-success-700, #07761f);
    }
  }

  div.sync-toast--update {
    border: 1px solid hsl(5, 34%, 82%);
    .sync-toast-subtitle {
      display: initial;
      font-size: 13px;
      color: hsl(0, 0%, 35%);
    }
    .reload-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      align-self: flex-start;
      margin-left: 0;
      padding: 0.375rem 0.75rem;
      border: none;
      border-radius: 0.5rem;
      background-color: hsl(5, 53%, 32%);
      color: white;
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
    }
    .reload-button:hover:not(:disabled) {
      background-color: hsl(5, 53%, 38%);
    }
    .reload-button:disabled {
      cursor: progress;
      opacity: 0.7;
    }
  }
  div.progress-bar {
    position: relative;
    width: 100%;
    background-color: hsla(358, 84%, 86%, 1);
    border-radius: 8px;
    height: 6px;
  }
  div.progress-bar-value {
    background-color: hsla(359, 47%, 38%, 1);
    border-radius: 8px;
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    transition: width 0.5s ease-in-out;
  }

  :global(.loading-icon) {
    animation: rotate 0.75s linear infinite;
  }
  @keyframes rotate {
    from {
      rotate: 0deg;
    }
    to {
      rotate: 1 1 1 360deg;
    }
  }
  div.sync-toast--stacked {
    position: relative;
    left: unset;
    right: unset;
    bottom: unset;
    top: unset;
    translate: unset;
    width: min(360px, calc(100vw - 1rem));
    z-index: unset;
  }

  @media (width >= 48rem) {
    div.sync-toast {
      /* Keep the sync status out of the top-right map orientation stack. */
      --map-controls-clearance: 9.75rem;

      bottom: unset;
      left: unset;
      right: 0.5rem;
      top: calc(0.5rem + var(--map-controls-clearance));
      width: min(360px, calc(100vw - 1rem));
      translate: unset;
      align-items: initial;
      .sync-toast-content {
        .sync-toast-text {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .sync-toast-header {
          font-size: 16px;
          font-weight: bold;
        }
        .sync-toast-subtitle {
          font-size: 14px;
          display: initial;
        }
      }
    }
  }
</style>
