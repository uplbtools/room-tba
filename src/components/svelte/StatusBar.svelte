<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
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
  });

  async function handleSignOut() {
    await adminAuthStore.logout();
    toastStore.show("Signed out.", "info");
  }

  function handleNavAction(id: "contributors" | "editor-login") {
    if (id === "contributors") {
      modalStore.openModal("landing");
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
</style>
