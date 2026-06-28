<script lang="ts">
  import { onMount } from "svelte";
  import Locate from "@lucide/svelte/icons/locate";
  import LocateFixed from "@lucide/svelte/icons/locate-fixed";
  import Plus from "@lucide/svelte/icons/plus";
  import {
    adminAuthStore,
    floatingControlPanelStore,
    locationStore,
    mapStore,
    toastStore,
  } from "@lib/store.svelte";
  import SuggestAdditionPanel from "@ui/SuggestAdditionPanel.svelte";

  type Props = {
    /** When true, render as inline actions inside the bottom chrome tray. */
    embedded?: boolean;
  };

  let { embedded = false }: Props = $props();

  let centered: boolean = $state(false);
  const suggestPanelId = "suggest-addition";
  const suggestMenuOpen = $derived(
    floatingControlPanelStore.openPanel === suggestPanelId,
  );

  onMount(() => {
    adminAuthStore.hydrate();
  });

  const showSuggestAddition = $derived(!adminAuthStore.canPublish);

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
</script>

<div class="map-control-stack" class:embedded>
  {#if showSuggestAddition}
    <div class="admin-control">
      {#if suggestMenuOpen}
        <div
          id="suggest-addition-menu"
          class="admin-panel suggest-panel"
          role="menu"
          aria-label="Propose a campus addition"
        >
          <SuggestAdditionPanel />
        </div>
      {/if}
      <button
        class="map-control-btn"
        onclick={() => floatingControlPanelStore.toggle(suggestPanelId)}
        title="Add something to the map"
        aria-label="Add something to the map"
        aria-expanded={suggestMenuOpen}
        aria-controls="suggest-addition-menu"
      >
        <Plus aria-hidden="true" />
      </button>
    </div>
  {/if}

  <button
    class="map-control-btn"
    onclick={handleLocationClick}
    title="My Location"
    aria-label="My Location"
  >
    {#if centered}
      <LocateFixed aria-hidden="true" />
    {:else}
      <Locate aria-hidden="true" />
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

  .map-control-stack.embedded {
    flex-direction: row;
    align-items: center;
    gap: 0.375rem;
  }

  .admin-control {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }

  .embedded .admin-control {
    position: relative;
    flex-direction: column-reverse;
    align-items: flex-end;
    gap: 0.375rem;
  }

  .map-control-btn {
    position: relative;
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    backdrop-filter: blur(10px);
    border: 1.5px solid var(--map-chrome-border-accent, hsl(5, 40%, 42%));
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: var(
      --map-chrome-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.18),
      0 2px 6px hsla(0, 0%, 0%, 0.18),
      0 8px 20px hsla(0, 0%, 0%, 0.14)
    );
    color: hsl(5, 53%, 32%);
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }

  .embedded .map-control-btn {
    width: 2.5rem;
    height: 2.5rem;
    border-width: 1px;
    box-shadow: var(
      --map-chrome-fab-shadow,
      inset 0 0 0 1px hsla(0, 0%, 100%, 0.72),
      0 1px 4px hsla(0, 0%, 0%, 0.16)
    );
  }

  .embedded .map-control-btn :global(svg) {
    width: 1.125rem;
    height: 1.125rem;
  }

  .map-control-btn:hover {
    background-color: hsl(0, 0%, 99%);
    border-color: hsl(5, 53%, 32%);
  }

  .map-control-btn:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 2px;
  }

  .admin-panel {
    display: flex;
    width: min(18rem, calc(100vw - 1rem));
    max-width: calc(100vw - 1rem);
    max-height: min(70vh, 28rem);
    flex-direction: column;
    gap: 0.5rem;
    border: 1px solid var(--map-chrome-border, hsl(5, 25%, 78%));
    border-radius: 0.875rem;
    background-color: var(--map-chrome-surface, rgba(255, 250, 250, 0.98));
    padding: 0.75rem;
    box-shadow: var(
      --map-chrome-panel-shadow,
      0 4px 14px hsla(0, 0%, 0%, 0.16)
    );
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .embedded .admin-panel {
    position: absolute;
    right: 0;
    bottom: calc(100% + 0.375rem);
    width: min(18rem, calc(100vw - 1.5rem));
  }

  .suggest-panel {
    width: min(18rem, calc(100vw - 1rem));
  }
</style>
