<script lang="ts">
  import { onMount } from "svelte";
  import Locate from "@lucide/svelte/icons/locate";
  import LocateFixed from "@lucide/svelte/icons/locate-fixed";
  import Plus from "@lucide/svelte/icons/plus";
  import {
    editorChromeStore,
    locationStore,
    mapStore,
    toastStore,
  } from "@lib/store.svelte";
  import { adminAuthStore } from "@lib/stores/admin-auth.svelte";

  type Props = {
    /** When true, render as inline actions inside the bottom chrome tray. */
    embedded?: boolean;
  };

  let { embedded = false }: Props = $props();

  let centered: boolean = $state(false);

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
    <button
      class="map-control-btn"
      onclick={() => editorChromeStore.openAdditionModal()}
      title="Add something to the map"
      aria-label="Add something to the map"
      aria-haspopup="dialog"
    >
      <Plus aria-hidden="true" />
    </button>
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
</style>
