<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import WifiOff from "@lucide/svelte/icons/wifi-off";
  import { onMount } from "svelte";
  import { registerSW } from "virtual:pwa-register";
  import { getAppData } from "@lib/context";
  import {
    modalStore,
    syncToastStore,
    adminAuthStore,
    toastStore,
  } from "@lib/store.svelte";
  import OfflineMaps from "@ui/OfflineMaps.svelte";
  import SyncStatus from "@ui/SyncStatus.svelte";
  import PWAInstallPrompt from "@ui/PWAInstallPrompt.svelte";
  import MapChromeSession from "@ui/map-chrome/MapChromeSession.svelte";
  import StatusBarDetails from "./status-bar/StatusBarDetails.svelte";
  import StatusBarDirectionsStat from "./status-bar/StatusBarDirectionsStat.svelte";
  import "./map-chrome/map-chrome.css";
  import "./status-bar/status-bar.css";
  import { MediaQuery } from "svelte/reactivity";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  const appData = getAppData();
  const { directionCount, totalRooms } = $derived(appData());
  let isOpen = $state(false);
  let isOnline = $state(true);

  const showFullSync = $derived(isOpen);
  const detailsCompact = $derived(!isOpen);
  const contributorSession = $derived(
    adminAuthStore.isLoggedIn &&
      !adminAuthStore.canPublish &&
      !adminAuthStore.canReview,
  );
  const sessionDisplayName = $derived(
    adminAuthStore.displayName ?? adminAuthStore.username ?? "Contributor",
  );
  const sessionRoleLabel = $derived(
    adminAuthStore.role === "admin"
      ? "Admin"
      : adminAuthStore.role === "editor"
        ? "Editor"
        : "Contributor",
  );
  const showSessionChip = $derived(contributorSession && !isOpen);
  const showSessionUtilities = $derived(contributorSession && isOpen);
  const progressPercent = $derived(
    totalRooms > 0 ? Math.floor((directionCount / totalRooms) * 100) : 0,
  );
  const showDirectionsProgress = $derived(
    directionCount != null &&
      totalRooms != null &&
      totalRooms > 0 &&
      !syncToastStore.isSyncing,
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

  function handleNavAction(id: "contributors" | "editor-login") {
    if (id === "contributors") {
      modalStore.openModal("landing", { landingTab: "campus" });
      return;
    }
    adminAuthStore.openLogin();
  }
</script>

<div class="status-bar" class:is-open={isOpen}>
  <div class="status-bar__head">
    <button
      type="button"
      class="status-bar__toggle"
      aria-expanded={isOpen}
      aria-controls="status-bar-details"
      onclick={() => (isOpen = !isOpen)}
    >
      {#if isOpen}
        <ChevronDown size={18} aria-hidden="true" />
      {:else}
        <ChevronRight size={18} aria-hidden="true" />
      {/if}
      <span>Status</span>
    </button>

    {#if isOpen}
      <div class="status-bar__utilities">
        <SyncStatus inline compact={false} expanded={showFullSync} />
        <span class="status-bar__sep" aria-hidden="true">·</span>
        <OfflineMaps compact={false} />
        {#if showSessionUtilities}
          <span class="status-bar__sep" aria-hidden="true">·</span>
          <MapChromeSession
            roleLabel={sessionRoleLabel}
            displayName={sessionDisplayName}
            utilities
            onSignOut={handleSignOut}
          />
        {/if}
      </div>
    {:else}
      <div class="status-bar__primary">
        <SyncStatus inline compact={detailsCompact} expanded={showFullSync} />
        <OfflineMaps compact={detailsCompact} />
        <PWAInstallPrompt />
        {#if !isOnline}
          <span class="status-bar__sep" aria-hidden="true">·</span>
          <span class="offline-chip" title="Offline mode">
            <WifiOff size={12} aria-hidden="true" />
            Offline
          </span>
        {/if}
        {#if showSessionChip}
          <MapChromeSession
            roleLabel={sessionRoleLabel}
            displayName={sessionDisplayName}
            title="Signed in as {sessionRoleLabel.toLowerCase()}"
            compact
            onSignOut={handleSignOut}
          />
        {/if}
        {#if showDirectionsProgress}
          <span class="status-bar__sep" aria-hidden="true">·</span>
          <StatusBarDirectionsStat
            {directionCount}
            {totalRooms}
            {progressPercent}
            variant="collapsed"
          />
        {/if}
      </div>
    {/if}
  </div>

  {#if isOpen}
    <StatusBarDetails
      reducedMotion={reducedMotion.current}
      {directionCount}
      {totalRooms}
      {progressPercent}
      {showDirectionsProgress}
      showEditorLogin={!adminAuthStore.isLoggedIn}
      onAction={handleNavAction}
    />
  {/if}
</div>

<style>
  * {
    pointer-events: auto;
  }

  .offline-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    border-radius: 0.75rem;
    border: 1px solid hsl(0, 0%, 82%);
    background: hsl(0, 0%, 97%);
    color: hsl(0, 0%, 38%);
    font-size: 0.8125rem;
    line-height: 1.15;
    flex-shrink: 0;
  }
</style>
