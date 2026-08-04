<script lang="ts">
  import Route from "@lucide/svelte/icons/route";
  import { sidebarStore } from "@lib/store.svelte";
  import { routableTodayWeekday, routeToday } from "@lib/today-route";
  import MapChromeActionChip from "./map-chrome/MapChromeActionChip.svelte";

  // Status-bar surface for the day route (#839). Hidden entirely when there
  // is nothing to route today — space in the bottom band is scarce, so no
  // disabled state here (the /today button carries the hints).
  const visible = $derived(routableTodayWeekday() !== null);
  let routing = $state(false);

  async function handleClick() {
    if (routing) return;
    routing = true;
    try {
      if (await routeToday()) {
        // No-op on the map; leaves the settings/contributors panel so the
        // routed map is visible, same promise as the /today button.
        sidebarStore.changeOpened("map");
      }
    } finally {
      routing = false;
    }
  }
</script>

{#if visible}
  <MapChromeActionChip
    onclick={handleClick}
    ariaBusy={routing}
    ariaLabel="Route my day"
    title="Route today's classes on the map"
  >
    <Route size={14} aria-hidden="true" />
    <span class="day-route-chip__label">
      {routing ? "Routing…" : "Route my day"}
    </span>
  </MapChromeActionChip>
{/if}

<style>
  /* The bottom band already crowds at 320px (online counter + legend +
     location); keep the icon and drop the label there, like the other
     compact chip triggers. */
  @media (max-width: 30rem) {
    .day-route-chip__label {
      display: none;
    }
  }
</style>
