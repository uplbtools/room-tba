import {
  appBootstrapStore,
  syncToastStore,
  modalStore,
} from "@lib/store.svelte";

export type SyncLadderKind =
  | "bootstrap_error"
  | "sync_error"
  | "update_ready"
  | "syncing"
  | "synced"
  | "initializing";

export function getSyncLadderState() {
  if (appBootstrapStore.phase === "error") {
    return {
      kind: "bootstrap_error" as const,
      label: appBootstrapStore.errorMessage ?? "Could not load campus data",
      detail: "Map is available; campus data failed to load.",
      actionLabel: "Try again",
      action: appBootstrapStore.canRetry
        ? () => appBootstrapStore.retry()
        : null,
      canRetry: appBootstrapStore.canRetry,
    };
  }
  if (syncToastStore.syncError !== null) {
    return {
      kind: "sync_error" as const,
      label: syncToastStore.stepLabel,
      detail: syncToastStore.stepDetail,
      actionLabel: "Retry",
      action: syncToastStore.canRetrySync
        ? () => syncToastStore.retrySync()
        : null,
      canRetry: syncToastStore.canRetrySync,
    };
  }
  if (syncToastStore.needRefresh) {
    return {
      kind: "update_ready" as const,
      label: syncToastStore.stepLabel,
      detail: syncToastStore.stepDetail,
      actionLabel: "Update",
      action: () => modalStore.openModal("changelog"),
      canRetry: false,
    };
  }
  if (syncToastStore.isSyncing) {
    return {
      kind: "syncing" as const,
      label: syncToastStore.stepLabel,
      detail: syncToastStore.stepDetail,
      actionLabel: null,
      action: null,
      canRetry: false,
    };
  }
  if (syncToastStore.allSynced) {
    return {
      kind: "synced" as const,
      label: syncToastStore.stepLabel,
      detail: syncToastStore.stepDetail,
      actionLabel: null,
      action: null,
      canRetry: false,
    };
  }
  return {
    kind: "initializing" as const,
    label: syncToastStore.stepLabel,
    detail: syncToastStore.stepDetail,
    actionLabel: null,
    action: null,
    canRetry: false,
  };
}
