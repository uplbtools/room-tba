<script lang="ts">
  import CornerRightUp from "@lucide/svelte/icons/corner-right-up";
  import MapChromeActionChip from "@ui/map-chrome/MapChromeActionChip.svelte";
  import { locationStore } from "@lib/store.svelte";

  type Props = {
    lat: number;
    lon: number;
    destinationLabel?: string;
    label?: string;
    toolbar?: boolean;
  };

  let {
    lat,
    lon,
    destinationLabel,
    label = "Directions",
    toolbar = true,
  }: Props = $props();

  const ariaLabel = $derived(
    destinationLabel
      ? `Get directions to ${destinationLabel}`
      : "Get directions",
  );

  function openDirections() {
    locationStore.requestLocation();
    locationStore.setDestination([lon, lat]);
  }
</script>

<MapChromeActionChip {toolbar} {ariaLabel} onclick={openDirections}>
  <CornerRightUp size={14} aria-hidden="true" />
  {label}
</MapChromeActionChip>
