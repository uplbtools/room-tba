<script lang="ts">
  import { onMount } from "svelte";
  import Lock from "@lucide/svelte/icons/lock";
  import Locate from "@lucide/svelte/icons/locate";
  import LocateFixed from "@lucide/svelte/icons/locate-fixed";
  import LogOut from "@lucide/svelte/icons/log-out";
  import Pencil from "@lucide/svelte/icons/pencil";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import {
    adminAuthStore,
    locationStore,
    mapEditStore,
    mapStore,
    toastStore,
  } from "../../lib/store.svelte";

  let centered: boolean = $state(false);
  onMount(() => {
    adminAuthStore.hydrate();
  });

  const handleLocationClick = () => {
    if (!locationStore.coords) {
      locationStore.requestLocation();
      return;
    }
    if (!mapStore.mapInstance) {
      toastStore.show("Map component is still initializing", "info");
      return;
    }

    centered = true;
    mapStore.mapInstance.flyTo({
      center: locationStore.coords,
      zoom: 17,
      offset: [0, -24],
      bearing: locationStore.bearing ?? 0,
      duration: 1500,
    });
  };

  function toggleMapEditMode() {
    mapEditStore.toggle();
  }

  async function handleLogout() {
    mapEditStore.close();
    await adminAuthStore.logout();
    toastStore.show("Signed out.", "info");
  }
</script>

<div class="map-control-stack">
  {#if adminAuthStore.isAdmin}
    <div class="map-control-btn admin-state" title="Signed in as admin">
      <ShieldCheck />
    </div>
    <button
      class="map-control-btn"
      class:active={mapEditStore.enabled}
      onclick={toggleMapEditMode}
      title={mapEditStore.enabled
        ? "Disable map edit mode"
        : "Enable map edit mode"}
      aria-label={mapEditStore.enabled
        ? "Disable map edit mode"
        : "Enable map edit mode"}
      aria-pressed={mapEditStore.enabled}
    >
      <Pencil />
    </button>
    <button
      class="map-control-btn"
      onclick={handleLogout}
      title="Sign out"
      aria-label="Sign out"
    >
      <LogOut />
    </button>
  {:else}
    <button
      class="map-control-btn"
      onclick={() => adminAuthStore.openLogin()}
      title="Editor login"
      aria-label="Editor login"
    >
      <Lock />
    </button>
  {/if}

  <button
    class="map-control-btn"
    onclick={handleLocationClick}
    title="My Location"
    aria-label="My Location"
  >
    {#if centered}
      <LocateFixed />
    {:else}
      <Locate />
    {/if}
  </button>
</div>

<style>
  .map-control-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    pointer-events: auto;
  }

  .admin-state {
    color: hsl(160, 84%, 26%);
    cursor: default;
  }

  .map-control-btn {
    background-color: white;
    border: 1px solid #ececec;
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    color: hsl(5, 53%, 32%);
    transition:
      background-color 0.2s,
      transform 0.2s;

    &:hover {
      background-color: hsl(5, 53%, 98%);
      transform: scale(1.05);
    }

    &.active {
      border-color: hsl(160, 84%, 26%);
      background-color: hsl(160, 84%, 26%);
      color: white;
    }
  }
</style>
