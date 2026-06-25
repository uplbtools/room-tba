<script lang="ts">
  import { onMount } from "svelte";
  import LogIn from "@lucide/svelte/icons/log-in";
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
  let adminMenuOpen = $state(false);
  const adminLabel = $derived(adminAuthStore.username ?? "admin");

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
    adminMenuOpen = false;
    mapEditStore.close();
    await adminAuthStore.logout();
    toastStore.show("Signed out.", "info");
  }
</script>

<div class="map-control-stack">
  {#if adminAuthStore.isAdmin}
    <div class="admin-control">
      {#if adminMenuOpen}
        <div
          id="admin-control-menu"
          class="admin-panel"
          role="menu"
          aria-label="Editor controls"
        >
          <div class="admin-status">
            <ShieldCheck size={16} />
            <span>
              <strong>Editor signed in</strong>
              <small>{adminLabel}</small>
            </span>
          </div>
          <button
            type="button"
            class="admin-menu-action"
            class:active={mapEditStore.enabled}
            role="menuitem"
            aria-pressed={mapEditStore.enabled}
            onclick={toggleMapEditMode}
          >
            <Pencil size={16} />
            {mapEditStore.enabled ? "Turn off map edit" : "Turn on map edit"}
          </button>
          <button
            type="button"
            class="admin-menu-action danger"
            role="menuitem"
            onclick={handleLogout}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      {/if}
      <button
        class="map-control-btn"
        class:active={mapEditStore.enabled}
        onclick={() => (adminMenuOpen = !adminMenuOpen)}
        title={mapEditStore.enabled
          ? "Editor controls: map edit mode on"
          : "Editor controls"}
        aria-label={mapEditStore.enabled
          ? "Editor controls, map edit mode on"
          : "Editor controls"}
        aria-expanded={adminMenuOpen}
        aria-controls="admin-control-menu"
        aria-pressed={mapEditStore.enabled}
      >
        <ShieldCheck />
      </button>
    </div>
  {:else}
    <button
      class="map-control-btn"
      onclick={() => adminAuthStore.openLogin()}
      title="Editor login"
      aria-label="Editor login"
    >
      <LogIn />
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
    align-items: flex-end;
    gap: 0.5rem;
    pointer-events: auto;
  }

  .admin-control {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
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

  .admin-panel {
    display: flex;
    width: 15.5rem;
    max-width: calc(100vw - 1rem);
    flex-direction: column;
    gap: 0.5rem;
    border-radius: 0.875rem;
    background-color: white;
    padding: 0.75rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .admin-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: hsl(160, 84%, 22%);
    font-size: 0.8125rem;
  }

  .admin-status span {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.1rem;
  }

  .admin-status small {
    overflow: hidden;
    color: hsl(0, 0%, 42%);
    font-size: 0.75rem;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .admin-menu-action {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
    border: 1px solid #d8b9ba;
    border-radius: 0.625rem;
    background-color: white;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 700;
    padding: 0.55rem 0.625rem;
  }

  .admin-menu-action:hover,
  .admin-menu-action:focus-visible {
    background-color: hsl(5, 53%, 98%);
  }

  .admin-menu-action.active {
    border-color: hsl(160, 84%, 26%);
    background-color: hsl(160, 84%, 26%);
    color: white;
  }

  .admin-menu-action.danger {
    border-color: hsl(0, 70%, 88%);
    color: hsl(0, 70%, 38%);
  }
</style>
