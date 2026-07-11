<script lang="ts">
  import { onMount } from "svelte";
  import Locate from "@lucide/svelte/icons/locate";
  import LocateFixed from "@lucide/svelte/icons/locate-fixed";
  import Plus from "@lucide/svelte/icons/plus";
  import "./map-chrome/map-chrome.css";
  import {
    adminAuthStore,
    editorChromeStore,
    locationStore,
    mapStore,
    toastStore,
  } from "@lib/store.svelte";

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
      class="map-chrome-control-btn"
      class:map-chrome-control-btn--compact={embedded}
      onclick={() => editorChromeStore.openAdditionModal()}
      title="Add something to the map"
      aria-label="Add something to the map"
      aria-haspopup="dialog"
    >
      <Plus size={embedded ? 18 : 24} aria-hidden="true" />
    </button>
  {/if}

  <button
    class="map-chrome-control-btn"
    class:map-chrome-control-btn--compact={embedded}
    onclick={handleLocationClick}
    title="My Location"
    aria-label="My Location"
  >
    {#if centered}
      <LocateFixed size={embedded ? 18 : 24} aria-hidden="true" />
    {:else}
      <Locate size={embedded ? 18 : 24} aria-hidden="true" />
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
</style>
