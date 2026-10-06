<script lang="ts">
  import Printer from "@lucide/svelte/icons/printer";
  import MapChromeActionLink from "@ui/map-chrome/MapChromeActionLink.svelte";
  import { getTransitMapPath } from "@lib/route-links";

  type Props = {
    lat: number;
    lon: number;
    name: string;
    ariaLabel?: string;
  };

  let {
    lat,
    lon,
    name,
    ariaLabel = `Download a printable jeepney map from ${name}`,
  }: Props = $props();

  const href = $derived(getTransitMapPath({ lat, lon, name }));
</script>

<MapChromeActionLink {href} {ariaLabel} toolbar>
  <Printer size={14} aria-hidden="true" />
  Printable map
</MapChromeActionLink>
