<script lang="ts">
  import { onMount } from "svelte";
  import { getAppData } from "@lib/context";
  import { createEntityUrlSync } from "@lib/entity-url-sync";
  import { currentRoom, mapEditStore, queryStore } from "@lib/store.svelte";

  const appData = getAppData();
  let sync = $state<ReturnType<typeof createEntityUrlSync> | null>(null);

  onMount(() => {
    const controller = createEntityUrlSync({
      getAppData: appData,
      hydrateQuery: (query) => {
        queryStore.hydrateQuery(query);
      },
      clearQuery: () => {
        queryStore.clearQuery();
      },
      getQuerySnapshot: () => ({
        type: queryStore.type,
        category: queryStore.category,
        value: queryStore.queryValue,
        eventSlug: queryStore.selectedEventSlug ?? undefined,
      }),
    });

    controller.init();
    sync = controller;

    return () => {
      controller.destroy();
      sync = null;
    };
  });

  $effect(() => {
    sync?.syncFromQuery({
      type: queryStore.type,
      category: queryStore.category,
      value: queryStore.queryValue,
      eventSlug: queryStore.selectedEventSlug ?? undefined,
      room: currentRoom.value,
      editMode: mapEditStore.enabled,
    });
  });
</script>
