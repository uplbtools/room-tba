<script lang="ts">
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
</script>

<!-- <Entry /> -->
