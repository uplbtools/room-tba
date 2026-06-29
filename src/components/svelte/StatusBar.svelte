<script lang="ts">
  import WifiOff from "@lucide/svelte/icons/wifi-off";
  import { onMount } from "svelte";
  import { registerSW } from "virtual:pwa-register";
  import { getAppData } from "@lib/context";
  import {
    appBootstrapStore,
    syncToastStore,
    adminAuthStore,
    toastStore,
  } from "@lib/store.svelte";
  import SyncStatus from "@ui/SyncStatus.svelte";
  import AppMenu from "./status-bar/AppMenu.svelte";
  import "./status-bar/status-bar.css";

  const appData = getAppData();
  const { directionCount, totalRooms } = $derived(appData());
  let isOnline = $state(true);

  const progressPercent = $derived(
    totalRooms > 0 ? Math.floor((directionCount / totalRooms) * 100) : 0,
  );
  const showDirectionsProgress = $derived(
    directionCount != null &&
      totalRooms != null &&
      totalRooms > 0 &&
      !syncToastStore.isSyncing,
  );
  const showUrgentSync = $derived(
    appBootstrapStore.phase === "error" ||
      syncToastStore.syncError !== null ||
      syncToastStore.needRefresh ||
      syncToastStore.isSyncing,
  );

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

  async function handleSignOut() {
    await adminAuthStore.logout();
    toastStore.show("Signed out.", "info");
  }
</script>

<div class="status-bar">
  <AppMenu
    {directionCount}
    {totalRooms}
    {progressPercent}
    {showDirectionsProgress}
    onSignOut={handleSignOut}
  />

  <div class="status-bar__badges" aria-live="polite">
    {#if showUrgentSync}
      <SyncStatus inline compact expanded={false} />
    {/if}
    {#if !isOnline}
      <span class="status-bar__offline" title="Offline mode">
        <WifiOff size={12} aria-hidden="true" />
        Offline
      </span>
    {/if}
  </div>
</div>
