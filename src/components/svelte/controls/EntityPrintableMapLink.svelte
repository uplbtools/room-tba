<script lang="ts">
  import Printer from "@lucide/svelte/icons/printer";
  import MapChromeActionLink from "@ui/map-chrome/MapChromeActionLink.svelte";
  import { getTransitMapPath } from "@lib/route-links";

  type Props = {
    lat: number;
    lon: number;
    name: string;
    ariaLabel?: string;
    /**
     * A quiet text link for the foot of a place sheet. The map it opens is the
     * jeepney route map with this place marked, not a map of the place, so it
     * does not belong among the place's own actions.
     */
    inline?: boolean;
  };

  let {
    lat,
    lon,
    name,
    ariaLabel = `Download a printable jeepney route map marking ${name}`,
    inline = false,
  }: Props = $props();

  const href = $derived(getTransitMapPath({ lat, lon, name }));
</script>

{#if inline}
  <a class="entity-printable-link" {href} aria-label={ariaLabel}>
    <Printer size={16} aria-hidden="true" />
    Print jeepney route map
  </a>
{:else}
  <MapChromeActionLink {href} {ariaLabel} toolbar>
    <Printer size={14} aria-hidden="true" />
    Print jeepney map
  </MapChromeActionLink>
{/if}

<style>
  .entity-printable-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.5rem;
    color: var(--theme-accent-text, #7b1113);
    font-size: 0.8125rem;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .entity-printable-link:focus-visible {
    outline: 2px solid var(--theme-accent-text, #7b1113);
    outline-offset: 2px;
    border-radius: 0.25rem;
  }
</style>
