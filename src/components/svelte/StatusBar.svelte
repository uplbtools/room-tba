<script lang="ts">
  import WifiOff from "@lucide/svelte/icons/wifi-off";
  import { onMount } from "svelte";
  import {
    appBootstrapStore,
    syncToastStore,
    adminAuthStore,
    toastStore,
    modalStore,
  } from "@lib/store.svelte";
  import "./status-bar/status-bar.css";
  import SyncStatus from "./SyncStatus.svelte";
  import SponsorBadge from "./SponsorBadge.svelte";
  import { getGoldSponsor, loadSponsors, type Sponsor } from "@lib/sponsors";

  let isOnline = $state(true);
  let goldSponsor = $state<Sponsor | null>(null);

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

    // Registration itself lives in src/pwa.ts, outside this island, so a
    // broken app bundle cannot block the worker update that would fix it.
    // It may have flagged an update before this component mounted.
    if (document.documentElement.dataset.pwaNeedRefresh === "true") {
      syncToastStore.markNeedRefresh();
    }
    const onNeedRefresh = () => syncToastStore.markNeedRefresh();
    window.addEventListener("pwa:need-refresh", onNeedRefresh);
    syncToastStore.setRefreshHandler(() => {
      window.dispatchEvent(new Event("pwa:apply-update"));
    });
    void loadSponsors().then((data) => {
      if (data) goldSponsor = getGoldSponsor(data.sponsors);
    });
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("pwa:need-refresh", onNeedRefresh);
    };
  });

  // async function handleSignOut() {
  //   await adminAuthStore.logout();
  //   toastStore.show("Signed out.", "info");
  // }
</script>

<div class="status-bar">
  <!-- <AppMenu onSignOut={handleSignOut} /> -->

  <SyncStatus inline compact={false} expanded />

  <!--
    No sync/retry/update pill here: SyncStatus above already renders the
    ladder state and its action button in this same row, so a pill duplicates it.
  -->
  <div class="status-bar__badges" aria-live="polite">
    {#if !isOnline}
      <span class="status-bar__offline" title="Offline mode">
        <WifiOff size={12} aria-hidden="true" />
        Offline
      </span>
    {/if}
  </div>
  {#if goldSponsor}
    <SponsorBadge sponsor={goldSponsor} />
  {/if}
</div>
