<script lang="ts">
  import CornerRightUp from "@lucide/svelte/icons/corner-right-up";
  import Plus from "@lucide/svelte/icons/plus";
  import MapChromeActionChip from "@ui/map-chrome/MapChromeActionChip.svelte";
  import { directionsStore, locationStore } from "@lib/store.svelte";

  type Props = {
    lat: number;
    lon: number;
    destinationLabel?: string;
    label?: string;
    toolbar?: boolean;
    /** Filled main action (place sheet header). */
    primary?: boolean;
  };

  let {
    lat,
    lon,
    destinationLabel,
    label = "Directions",
    toolbar = true,
    primary = false,
  }: Props = $props();

  const addingStop = $derived(
    directionsStore.active && directionsStore.addingStop,
  );

  const ariaLabel = $derived(
    addingStop
      ? `Add ${destinationLabel ?? "this place"} as a stop`
      : destinationLabel
        ? `Get directions to ${destinationLabel}`
        : "Get directions",
  );

  const chipLabel = $derived(addingStop ? "Add stop" : label);

  function onChipClick() {
    const endpoint = {
      lat,
      lng: lon,
      label: destinationLabel ?? "Destination",
    };

    if (directionsStore.active && directionsStore.addingStop) {
      void directionsStore.addWaypoint(endpoint);
      return;
    }

    locationStore.requestLocation();
    // Multi-modal directionsStore owns the session. Do not also set
    // locationStore.destination — that feeds the legacy OSRM polyline, which
    // would redraw after close once directionsStore.active flips false.
    void directionsStore.open(
      endpoint,
      locationStore.coords
        ? {
            lat: locationStore.coords[1],
            lng: locationStore.coords[0],
            label: "Your location",
          }
        : null,
    );
  }
</script>

<MapChromeActionChip {toolbar} {primary} {ariaLabel} onclick={onChipClick}>
  {#if addingStop}
    <Plus size={14} aria-hidden="true" />
  {:else}
    <CornerRightUp size={14} aria-hidden="true" />
  {/if}
  {chipLabel}
</MapChromeActionChip>
