<script lang="ts">
  import MapPin from "@lucide/svelte/icons/map-pin";
  import MapChromeActionLink from "@ui/map-chrome/MapChromeActionLink.svelte";
  import { getGoogleMapsPinUrl } from "@lib/google-maps-links";

  type Props = {
    lat: number;
    lon: number;
    name?: string;
    ariaLabel?: string;
    label?: string;
    toolbar?: boolean;
  };

  let {
    lat,
    lon,
    name,
    ariaLabel = "Open in Google Maps",
    label = "Google Maps",
    toolbar = true,
  }: Props = $props();

  const href = $derived(getGoogleMapsPinUrl(lat, lon, name));
</script>

<MapChromeActionLink {href} {ariaLabel} {toolbar}>
  <MapPin size={14} aria-hidden="true" />
  {label}
</MapChromeActionLink>
