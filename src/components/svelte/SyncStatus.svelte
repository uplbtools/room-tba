<script lang="ts">
  import {
    CircleCheckBig,
    Info,
    LoaderCircle,
    RefreshCw,
    X,
  } from "@lucide/svelte";
  import { syncToastStore } from "@lib/store.svelte";

  type Props = {
    /** When true, show compact collapsed label for mobile status bar. */
    compact?: boolean;
    /** When true, show full detail (status bar expanded). */
    expanded?: boolean;
    /** When true, render as inline bar text (no nested chip). */
    inline?: boolean;
  };

  let { compact = false, expanded = false, inline = false }: Props = $props();

  let manualClosed = $state<boolean>(false);
  let reloading = $state<boolean>(false);

  const progressPercent = $derived.by(() => {
    const syncData = syncToastStore.currentSyncData;
    if (!syncData || syncData.total <= 0) return 0;
    return Math.floor((syncData.synced / syncData.total) * 5) * 20;
  });

  const manualCloseResetKey = $derived(
    `${syncToastStore.recentlySynced}:${syncToastStore.allSynced}:${syncToastStore.currentSync}`,
  );

  const isActive = $derived(
    syncToastStore.needRefresh ||
      ((syncToastStore.recentlySynced === null ||
        syncToastStore.recentlySynced) &&
        !manualClosed),
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

  const showDetail = $derived(expanded || (!compact && !inline));
  const showDismiss = $derived(
    (expanded || !compact) &&
      (!inline || syncToastStore.allSynced || syncToastStore.needRefresh),
  );
  const showReload = $derived(showDetail && syncToastStore.needRefresh);
  const showSyncProgress = $derived(
    expanded &&
      !syncToastStore.allSynced &&
      syncToastStore.currentSyncData !== null,
  );

  const collapsedLabel = $derived.by(() => {
    if (syncToastStore.needRefresh) return "Update ready";
    if (syncToastStore.allSynced) return "Ready offline";
    if (syncToastStore.currentSync === null) return "Syncing…";
    return "Syncing…";
  });
</script>

{#if isActive}
  <div
    class="sync-status"
    class:sync-status--inline={inline}
    class:sync-status--compact={compact && !expanded}
    class:sync-status--success={syncToastStore.allSynced &&
      !syncToastStore.needRefresh}
    class:sync-status--update={syncToastStore.needRefresh}
    role="status"
    aria-live="polite"
  >
    {#if syncToastStore.needRefresh}
      <Info size={16} />
      <div class="sync-status-copy">
        <span class="sync-status-label">Update ready</span>
        {#if showDetail}
          <span class="sync-status-detail"
            >Reload to get the latest updates.</span
          >
        {/if}
      </div>
      {#if showReload}
        <button
          class="sync-action reload-button"
          type="button"
          onclick={() => syncToastStore.reload()}
          disabled={reloading}
        >
          <RefreshCw size={14} class={reloading ? "loading-icon" : ""} />
          {reloading ? "Reloading…" : "Reload"}
        </button>
      {/if}
      {#if showDismiss}
        <button
          class="sync-dismiss"
          type="button"
          aria-label="Dismiss update notice"
          onclick={() => syncToastStore.dismissRefresh()}
        >
          <X size={14} />
        </button>
      {/if}
    {:else if syncToastStore.allSynced}
      <CircleCheckBig size={16} />
      <div class="sync-status-copy">
        <span class="sync-status-label">{collapsedLabel}</span>
        {#if showDetail}
          <span class="sync-status-detail">Room TBA can now work offline</span>
        {/if}
      </div>
      {#if showDismiss}
        <button
          class="sync-dismiss"
          type="button"
          aria-label="Dismiss sync status"
          onclick={() => (manualClosed = true)}
        >
          <X size={14} />
        </button>
      {/if}
    {:else}
      <LoaderCircle size={16} class="loading-icon" />
      <div class="sync-status-copy">
        <span class="sync-status-label">{collapsedLabel}</span>
        {#if showDetail && syncToastStore.currentSync !== null}
          <span class="sync-status-detail">
            Syncing {syncToastStore.currentSync} to device
          </span>
        {/if}
      </div>
      {#if showSyncProgress}
        <div class="progress-bar">
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
        <span class="progress-label">{progressPercent}%</span>
      {/if}
      {#if showDismiss}
        <button
          class="sync-dismiss"
          type="button"
          aria-label="Dismiss sync status"
          onclick={() => (manualClosed = true)}
        >
          <X size={14} />
        </button>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .sync-status {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 1.625rem;
    padding: 0.1875rem 0.625rem;
    border-radius: 0.75rem;
    background-color: hsl(0, 0%, 97%);
    color: hsl(0, 0%, 20%);
    font-size: 0.8125rem;
    line-height: 1.15;
    flex: 0 1 auto;
    min-width: 0;
    max-width: min(100%, 12rem);
  }

  .sync-status--compact {
    flex: 0 0 auto;
    max-width: min(100%, 10.5rem);
  }

  .sync-status--success {
    border: 1px solid hsl(133, 60%, 82%);
    background: hsl(133, 60%, 96%);
    color: hsl(133, 100%, 13%);
  }

  .sync-status--update {
    border: 1px solid hsl(5, 34%, 82%);
    background: hsl(0, 0%, 99%);
  }

  .sync-status--inline {
    min-height: 0;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    flex: 0 0 auto;
    max-width: none;
    gap: 0.375rem;
    font-size: inherit;
    line-height: inherit;
    border-right: 1px solid hsl(0, 0%, 82%);
    padding-right: 0.75rem;
    margin-right: 0.125rem;
  }

  .sync-status--inline.sync-status--success {
    background: transparent;
    border-right-color: hsl(133, 40%, 82%);
    color: hsl(133, 100%, 13%);
  }

  .sync-status--inline.sync-status--update {
    background: transparent;
    border-right-color: hsl(5, 34%, 82%);
    color: hsl(5, 53%, 32%);
  }

  .sync-status--inline .sync-status-copy {
    flex: 0 1 auto;
  }

  .sync-status--inline .sync-status-label {
    font-weight: inherit;
  }

  @media (max-width: 48rem) {
    .sync-status--inline {
      flex: 1 1 auto;
      min-width: 0;
      max-width: none;
    }

    .sync-status--inline .sync-status-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  @media (min-width: 48.0625rem) and (max-width: 50rem) {
    .sync-status--inline {
      width: 100%;
      margin-right: 0;
      padding-right: 0;
      border-right: none;
    }
  }

  .sync-status-copy {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 0;
  }

  .sync-status-label {
    overflow: hidden;
    font-weight: 600;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sync-status-detail {
    overflow: hidden;
    color: hsl(0, 0%, 38%);
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sync-action.reload-button {
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
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .sync-action.reload-button:hover:not(:disabled) {
    background-color: hsl(5, 53%, 38%);
  }

  .sync-action.reload-button:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  .sync-dismiss {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    padding: 0.25rem;
    opacity: 0.65;
  }

  .sync-dismiss:hover {
    opacity: 1;
  }

  .progress-bar {
    position: relative;
    width: 5rem;
    height: 6px;
    flex-shrink: 0;
    border-radius: 8px;
    background-color: hsla(358, 84%, 86%, 1);
  }

  .progress-bar-value {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    border-radius: 8px;
    background-color: hsla(359, 47%, 38%, 1);
    transition: width 0.5s ease-in-out;
  }

  .progress-label {
    flex-shrink: 0;
    font-size: 0.75rem;
    font-weight: 600;
  }

  :global(.loading-icon) {
    animation: rotate 0.75s linear infinite;
  }

  @keyframes rotate {
    from {
      rotate: 0deg;
    }
    to {
      rotate: 360deg;
    }
  }
</style>
