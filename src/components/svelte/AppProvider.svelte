<!-- <script lang="ts">
  import { onMount } from "svelte";
  import { isBrowser } from "es-toolkit";
  import { syncData } from "../../lib/local/data/sync";
  // import { AppContextData, setAppData } from "../../lib/context";
  // import Entry from "./Entry.svelte";
  import { getLocalBuildings, getLocalColleges } from "../../lib/local/data/utils";

  // type Props = AppContextData;

  onMount(async () => {
    if (isBrowser()) {
      syncData();
    }
  });
</script> -->

<!-- <Entry /> -->
  import type { AppPageData, InitialSearchState } from "../../lib/app-data";
  import { setAppData } from "../../lib/context";
  import { queryStore } from "../../lib/store.svelte";
  import Entry from "./Entry.svelte";

  type Props = AppPageData & {
    initialSearch?: InitialSearchState;
    suppressLandingModal?: boolean;
  };
  const appData: Props = $props();

  queryStore.hydrateQuery(
    appData.initialSearch
      ? {
          category: appData.initialSearch.category,
          type: "result",
          value: appData.initialSearch.value,
        }
      : {
          category: null,
          type: "query",
          value: "",
        },
  );

  // svelte-ignore state_referenced_locally
  setAppData(appData);
</script>

<Entry
  initialSearch={appData.initialSearch}
  suppressLandingModal={appData.suppressLandingModal ?? false}
/>
