<script lang="ts">
  /**
   * Renderless: keeps the drawn jeepney route tied to the panel that drew it.
   * Lives in SidePanel, which is mounted for the whole app session.
   */
  import { untrack } from "svelte";
  import { jeepneyStore, queryStore } from "@lib/store.svelte";
  import {
    isRoutePanelQuery,
    shouldClearDrawnRoute,
  } from "@lib/transit-route-visibility";

  // Picking a place or another list while a stop is open replaces the stop
  // panel (it otherwise outranks every other panel and hides the choice).
  let lastQueryKey: string | null = null;
  $effect(() => {
    const key = `${queryStore.type}:${queryStore.category}:${queryStore.queryValue}`;
    const changed = lastQueryKey !== null && key !== lastQueryKey;
    lastQueryKey = key;
    if (
      changed &&
      queryStore.category !== null &&
      !isRoutePanelQuery(queryStore.category, queryStore.queryValue) &&
      untrack(() => jeepneyStore.selectedStopIndex) !== null
    ) {
      jeepneyStore.closeStop();
    }
  });

  // A route drawn by the route/stop panel leaves with it: X, Back, another
  // list or a picked place must not strand the line and its numbered pins on
  // the map with nothing on screen that can remove them.
  $effect(() => {
    if (
      shouldClearDrawnRoute({
        routeId: jeepneyStore.selectedRouteId,
        pinned: jeepneyStore.routePinned,
        stopOpen: jeepneyStore.selectedStopIndex !== null,
        routePanelOpen: isRoutePanelQuery(
          queryStore.category,
          queryStore.queryValue,
        ),
      })
    ) {
      jeepneyStore.clearRoute();
    }
  });
</script>
