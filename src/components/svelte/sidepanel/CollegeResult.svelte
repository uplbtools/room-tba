<script lang="ts">
  import { queryStore } from "../../../lib/store.svelte";
  import { getAppData } from "../../../lib/context";
  import { getCollegeRooms } from "../../../lib/local/data/utils";
  import type { RoomData } from "../../../lib/types";
    import ResultDisplay from "./ResultDisplay.svelte";
    import { checkLocalCollegeRoom, syncCollegeRooms } from "../../../lib/local/data/sync";
    import { onMount } from "svelte";

    const appData = getAppData();
  const { colleges, loaded } = $derived(appData());

  const college = $derived(
    loaded
      ? colleges.find((c) => c.collegeName === queryStore.queryValue)
      : null,
  );

  let collegeRooms = $state<RoomData[] | null>(null);

  onMount(async() => {
    if (!college) return;
    const collegeChecker = await checkLocalCollegeRoom(college.id)
    collegeRooms = await getCollegeRooms(collegeChecker, college.id);
    await syncCollegeRooms(collegeChecker, college.id, collegeRooms);

  });
</script>

<div class="college-query-wrapper">
  {#if college}
    <div class="college-header">
      <h2 class="college-title">{college.collegeName}</h2>
    </div>
  {/if}
  {#if collegeRooms}
    <ResultDisplay filteredRooms={collegeRooms} />
  {:else}
    Loading data...
  {/if}
</div>

<style>
  .college-query-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.75rem; /* 12px gap from design */
    width: 100%;
    flex: 1 1 0;
    overflow-y: auto;
  }

  .college-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem; /* 4px gap */
    width: 100%;
    flex-shrink: 0;
  }

  .college-title {
    font-size: 1.125rem; /* 18px */
    font-weight: bold;
    color: black;
    margin: 0;
    line-height: 1.25rem; /* 20px */
  }
</style>
