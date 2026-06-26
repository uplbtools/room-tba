<script>
  import { getAppData } from "@lib/context";
  import { queryStore } from "@lib/store.svelte";
  import ScheduleRender from "../room/ScheduleRender.svelte";
  const appData = getAppData();
  const { classesMap } = $derived(appData());
  // const classes = $derived(classesMap.get(queryStore.inputValue) ?? []);
</script>

<!-- {#if queryStore.category === "room" && queryStore.type === "result"}
  <ScheduleRender roomCode={queryStore.inputValue} {classes} />
{/if} -->
