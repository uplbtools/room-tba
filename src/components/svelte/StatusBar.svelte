<script lang="ts">
  import WifiOff from "@lucide/svelte/icons/wifi-off";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";
  import { onMount } from "svelte";
  import { registerSW } from "virtual:pwa-register";
  import {
    appBootstrapStore,
    syncToastStore,
    adminAuthStore,
    toastStore,
    modalStore,
  } from "@lib/store.svelte";
  import AppMenu from "./status-bar/AppMenu.svelte";
  import "./status-bar/status-bar.css";

  let isOnline = $state(true);

  // A single compact status pill — the sprawling step-by-step detail lives in
  // the App menu's Data section (SyncStatus expanded), one tap away. Priority:
  // data load failed > sync failed > update ready > syncing.
  type StatusPill = {
    kind: "error" | "update" | "syncing";
    label: string;
    action: (() => void) | null;
  };

  const statusPill = $derived.by<StatusPill | null>(() => {
    if (appBootstrapStore.phase === "error") {
      return {
        kind: "error",
        label: "Retry",
        action: appBootstrapStore.canRetry
          ? () => appBootstrapStore.retry()
          : null,
      };
    }
    if (syncToastStore.syncError !== null) {
      return {
        kind: "error",
        label: "Retry",
        action: syncToastStore.canRetrySync
          ? () => syncToastStore.retrySync()
          : null,
      };
    }
    if (syncToastStore.needRefresh) {
      // Show the changelog + require an explicit confirm before reloading,
      // instead of reloading immediately on click.
      return {
        kind: "update",
        label: "Update",
        action: () => modalStore.openModal("changelog"),
      };
    }
    if (syncToastStore.isSyncing) {
      return { kind: "syncing", label: "Syncing", action: null };
    }
    return null;
  });

  onMount(() => {
    isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    const onOnline = () => {
      isOnline = true;
      toastStore.show("Back online — campus data will sync.", "success");
    };
    const onOffline = () => {
      isOnline = false;
      toastStore.show(
        "You’re offline. Map and cached data still work.",
        "info",
      );
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

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
      void updateSW(true);
    });
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  });

  // async function handleSignOut() {
  //   await adminAuthStore.logout();
  //   toastStore.show("Signed out.", "info");
  // }
</script>

<div class="status-bar">
  <!-- <AppMenu onSignOut={handleSignOut} /> -->

  <div class="status-bar__badges" aria-live="polite">
    {#if statusPill}
      {#if statusPill.action}
        <button
          type="button"
          class="status-bar__pill status-bar__pill--{statusPill.kind}"
          onclick={statusPill.action}
        >
          {#if statusPill.kind === "update"}
            <RefreshCw size={12} aria-hidden="true" />
          {:else if statusPill.kind === "error"}
            <TriangleAlert size={12} aria-hidden="true" />
          {:else}
            <LoaderCircle size={12} class="status-bar__spin" aria-hidden="true" />
          {/if}
          {statusPill.label}
        </button>
      {:else}
        <span class="status-bar__pill status-bar__pill--{statusPill.kind}">
          {#if statusPill.kind === "syncing"}
            <LoaderCircle size={12} class="status-bar__spin" aria-hidden="true" />
          {:else if statusPill.kind === "error"}
            <TriangleAlert size={12} aria-hidden="true" />
          {/if}
          {statusPill.label}
        </span>
      {/if}
    {/if}
    {#if !isOnline}
      <span class="status-bar__offline" title="Offline mode">
        <WifiOff size={12} aria-hidden="true" />
        Offline
      </span>
    {/if}
  </div>
</div>
