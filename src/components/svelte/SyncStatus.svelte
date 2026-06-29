<script lang="ts">
  import {
    CircleCheckBig,
    Info,
    LoaderCircle,
    RefreshCw,
    X,
    FileText,
  } from "@lucide/svelte";
  import { syncToastStore, appBootstrapStore } from "@lib/store.svelte";
  import { APP_VERSION_LABEL } from "@constants/version";

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
  let retrying = $state<boolean>(false);

  const LABEL_HOLD_MS = 650;
  let displayedLabel = $state("");
  let displayedDetail = $state<string | null>(null);
  let labelHoldTimeout: ReturnType<typeof setTimeout> | undefined;

  const manualCloseResetKey = $derived(
    `${syncToastStore.recentlySynced}:${syncToastStore.allSynced}:${syncToastStore.currentSync}:${syncToastStore.syncError}:${syncToastStore.isSyncing}`,
  );

  const isActive = $derived(
    appBootstrapStore.phase === "error" ||
      syncToastStore.syncError !== null ||
      syncToastStore.needRefresh ||
      syncToastStore.isSyncing ||
      ((syncToastStore.recentlySynced === null ||
        syncToastStore.recentlySynced) &&
        syncToastStore.allSynced &&
        !manualClosed),
  );

  $effect(() => {
    if (manualCloseResetKey) {
      manualClosed = false;
    }
  });

  $effect(() => {
    let timeout: number | null = null;
    if (syncToastStore.allSynced && syncToastStore.syncError === null) {
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

  /** Inline status bar: label carries sync steps; stacked detail clutters the two-row layout. */
  const showDetail = $derived.by(() => {
    if (inline) {
      if (compact && !expanded) return false;
      return (
        appBootstrapStore.phase === "error" ||
        syncToastStore.syncError !== null ||
        syncToastStore.needRefresh
      );
    }
    return expanded || (!compact && !inline);
  });
  const showDismiss = $derived(
    (expanded || !compact) &&
      !syncToastStore.isSyncing &&
      syncToastStore.syncError === null &&
      (syncToastStore.needRefresh || (!inline && syncToastStore.allSynced)),
  );
  const showReload = $derived(showDetail && syncToastStore.needRefresh);
  const showProgress = $derived(
    syncToastStore.isSyncing && syncToastStore.hasCountableProgress,
  );
  const showIndeterminate = $derived(
    syncToastStore.isSyncing && !syncToastStore.hasCountableProgress,
  );

  const statusLabel = $derived.by(() => {
    if (appBootstrapStore.phase === "error") {
      return appBootstrapStore.errorMessage ?? "Could not load campus data";
    }
    return syncToastStore.stepLabel;
  });

  const statusDetail = $derived.by(() => {
    if (appBootstrapStore.phase === "error") {
      return "Map is available; campus data failed to load.";
    }
    return syncToastStore.stepDetail;
  });

  const urgentStatus = $derived(
    appBootstrapStore.phase === "error" ||
      syncToastStore.syncError !== null ||
      syncToastStore.needRefresh,
  );

  $effect(() => {
    const nextLabel = statusLabel;
    const nextDetail = showDetail ? statusDetail : null;

    if (!displayedLabel) {
      displayedLabel = nextLabel;
      displayedDetail = nextDetail;
      return;
    }

    if (urgentStatus || !syncToastStore.isSyncing) {
      if (labelHoldTimeout) {
        clearTimeout(labelHoldTimeout);
        labelHoldTimeout = undefined;
      }
      displayedLabel = nextLabel;
      displayedDetail = nextDetail;
      return;
    }

    if (nextLabel === displayedLabel) {
      displayedDetail = nextDetail;
      return;
    }

    if (labelHoldTimeout) clearTimeout(labelHoldTimeout);
    labelHoldTimeout = setTimeout(() => {
      displayedLabel = nextLabel;
      displayedDetail = nextDetail;
      labelHoldTimeout = undefined;
    }, LABEL_HOLD_MS);

    return () => {
      if (labelHoldTimeout) {
        clearTimeout(labelHoldTimeout);
        labelHoldTimeout = undefined;
      }
    };
  });

  const showBootstrapRetry = $derived(
    appBootstrapStore.phase === "error" && appBootstrapStore.canRetry,
  );
  const showSyncRetry = $derived(
    syncToastStore.syncError !== null && syncToastStore.canRetrySync,
  );

  async function handleBootstrapRetry() {
    retrying = true;
    try {
      appBootstrapStore.retry();
    } finally {
      retrying = false;
    }
  }

  async function handleSyncRetry() {
    retrying = true;
    try {
      syncToastStore.retrySync();
    } finally {
      retrying = false;
    }
  }
</script>

{#if isActive}
  <div
    class="sync-status"
    class:sync-status--inline={inline}
    class:sync-status--compact={compact && !expanded}
    class:sync-status--success={syncToastStore.allSynced &&
      !syncToastStore.needRefresh &&
      appBootstrapStore.phase !== "error" &&
      syncToastStore.syncError === null}
    class:sync-status--update={syncToastStore.needRefresh}
    class:sync-status--error={appBootstrapStore.phase === "error" ||
      syncToastStore.syncError !== null}
    class:sync-status--syncing={syncToastStore.isSyncing}
    role={appBootstrapStore.phase === "error" || syncToastStore.syncError
      ? "alert"
      : "status"}
    aria-live="polite"
  >
    {#if appBootstrapStore.phase === "error"}
      <Info size={16} aria-hidden="true" />
      <div class="sync-status-copy">
        <span class="sync-status-label">{displayedLabel}</span>
        {#if showDetail && displayedDetail}
          <span class="sync-status-detail">{displayedDetail}</span>
        {/if}
      </div>
      {#if showBootstrapRetry}
        <button
          class="sync-action reload-button"
          type="button"
          onclick={handleBootstrapRetry}
          disabled={retrying}
        >
          <RefreshCw
            size={14}
            class={retrying ? "loading-icon" : ""}
            aria-hidden="true"
          />
          {retrying ? "Retrying…" : "Try again"}
        </button>
      {/if}
    {:else if syncToastStore.syncError !== null}
      <Info size={16} aria-hidden="true" />
      <div class="sync-status-copy">
        <span class="sync-status-label">{displayedLabel}</span>
        {#if showDetail && displayedDetail}
          <span class="sync-status-detail">{displayedDetail}</span>
        {/if}
      </div>
      {#if showSyncRetry}
        <button
          class="sync-action reload-button"
          type="button"
          onclick={handleSyncRetry}
          disabled={retrying}
        >
          <RefreshCw
            size={14}
            class={retrying ? "loading-icon" : ""}
            aria-hidden="true"
          />
          {retrying ? "Retrying…" : "Retry"}
        </button>
      {/if}
    {:else if syncToastStore.needRefresh}
      <Info size={16} aria-hidden="true" />
      <div class="sync-status-copy">
        <span class="sync-status-label">
          {displayedLabel}
          {#if APP_VERSION_LABEL}
            <span class="version-label">· {APP_VERSION_LABEL}</span>
          {/if}
        </span>
        {#if showDetail && displayedDetail}
          <span class="sync-status-detail">{displayedDetail}</span>
        {/if}
      </div>
      {#if showReload}
        <a
          class="sync-action changelog-link"
          href="/changelog"
          target="_blank"
          rel="noopener noreferrer"
          title="View full changelog"
        >
          <FileText size={12} aria-hidden="true" />
          Changelog
        </a>
        <button
          class="sync-action reload-button"
          type="button"
          onclick={() => syncToastStore.reload()}
          disabled={reloading}
        >
          <RefreshCw
            size={14}
            class={reloading ? "loading-icon" : ""}
            aria-hidden="true"
          />
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
          <X size={14} aria-hidden="true" />
        </button>
      {/if}
    {:else if syncToastStore.allSynced}
      <CircleCheckBig size={16} aria-hidden="true" />
      <div class="sync-status-copy">
        <span class="sync-status-label">{displayedLabel}</span>
        {#if showDetail && displayedDetail}
          <span class="sync-status-detail">{displayedDetail}</span>
        {/if}
      </div>
      {#if showDismiss}
        <button
          class="sync-dismiss"
          type="button"
          aria-label="Dismiss sync status"
          onclick={() => (manualClosed = true)}
        >
          <X size={14} aria-hidden="true" />
        </button>
      {/if}
    {:else}
      <LoaderCircle size={16} class="loading-icon" aria-hidden="true" />
      <div class="sync-status-copy">
        <span class="sync-status-label">{displayedLabel}</span>
        {#if showDetail && displayedDetail}
          <span class="sync-status-detail">{displayedDetail}</span>
        {/if}
      </div>
      {#if syncToastStore.isSyncing && (inline || (compact && !expanded))}
        <div
          class="progress-bar progress-bar--compact progress-bar--inline"
          class:progress-bar--indeterminate={!showProgress}
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={showProgress
            ? syncToastStore.progressPercent
            : undefined}
          aria-label={displayedLabel}
        >
          {#if showProgress}
            <div
              class="progress-bar-value"
              style:width={`${syncToastStore.progressPercent}%`}
            ></div>
          {:else}
            <div
              class="progress-bar-value progress-bar-value--indeterminate"
            ></div>
          {/if}
        </div>
      {:else if showProgress}
        <div
          class="progress-bar"
          class:progress-bar--compact={compact && !expanded}
          class:progress-bar--inline={inline}
        >
          <div
            class="progress-bar-value"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={syncToastStore.progressPercent}
            aria-label={displayedLabel}
            style:width={`${syncToastStore.progressPercent}%`}
          ></div>
        </div>
        {#if expanded && !inline}
          <span class="progress-label">{syncToastStore.progressPercent}%</span>
        {/if}
      {:else if showIndeterminate && ((compact && !expanded) || inline)}
        <div
          class="progress-bar progress-bar--compact progress-bar--indeterminate"
          role="progressbar"
          aria-label={displayedLabel}
        >
          <div
            class="progress-bar-value progress-bar-value--indeterminate"
          ></div>
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .sync-status {
    display: flex;
    align-items: center;
    gap: 0.3125rem;
    min-height: 1.5rem;
    padding: 0.125rem 0.5rem;
    border-radius: 0.75rem;
    background-color: hsl(0, 0%, 97%);
    color: hsl(0, 0%, 20%);
    font-size: 0.8125rem;
    line-height: 1.15;
    flex: 0 1 auto;
    min-width: 0;
    max-width: min(100%, 16rem);
  }

  .sync-status--compact {
    flex: 0 1 auto;
    max-width: min(100%, 14rem);
  }

  .sync-status--syncing.sync-status--compact {
    max-width: min(100%, 18rem);
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

  .sync-status--error {
    border: 1px solid hsl(5, 34%, 82%);
    background: hsl(0, 0%, 99%);
    color: hsl(5, 53%, 32%);
  }

  .sync-status--inline {
    min-height: 1.25rem;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    flex: 0 1 auto;
    max-width: none;
    gap: 0.25rem;
    font-size: inherit;
    line-height: inherit;
    border-right: 1px solid hsl(0, 0%, 82%);
    padding-right: 0.5rem;
    margin-right: 0.0625rem;
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

  .sync-status--inline.sync-status--error {
    background: transparent;
    border-right-color: hsl(5, 34%, 82%);
    color: hsl(5, 53%, 32%);
  }

  .sync-status--inline .sync-status-copy {
    flex: 1 1 auto;
    flex-direction: row;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
    overflow: hidden;
  }

  .sync-status--inline .sync-status-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: inherit;
  }

  .sync-status--inline .sync-status-detail {
    font-size: inherit;
    color: inherit;
    opacity: 0.75;
  }

  @media (max-width: 48rem) {
    .sync-status--inline {
      flex: 1 1 auto;
      min-width: 0;
      max-width: none;
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
    padding: 0.125rem;
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
    overflow: hidden;
  }

  .progress-bar--compact {
    width: 2.5rem;
    height: 4px;
  }

  .progress-bar--inline {
    width: 2.25rem;
    height: 4px;
    flex: 0 0 2.25rem;
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

  .progress-bar--indeterminate .progress-bar-value--indeterminate {
    width: 40%;
    animation: indeterminate 1.2s ease-in-out infinite;
  }

  .progress-label {
    flex-shrink: 0;
    font-size: 0.75rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
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

  @keyframes indeterminate {
    0% {
      left: -40%;
    }
    100% {
      left: 100%;
    }
  }

  .version-label {
    opacity: 0.7;
    font-weight: 500;
  }

  .changelog-link {
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    border-radius: 0.5rem;
    border: 1px solid hsl(5, 34%, 82%);
    background: transparent;
    color: hsl(5, 53%, 32%);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }

  .changelog-link:hover,
  .changelog-link:focus-visible {
    background: hsl(5, 20%, 96%);
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.loading-icon) {
      animation: none;
    }

    .progress-bar-value {
      transition: none;
    }

    .progress-bar--indeterminate .progress-bar-value--indeterminate {
      animation: none;
      left: 0;
      width: 100%;
      opacity: 0.45;
    }
  }
</style>
