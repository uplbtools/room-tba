<script lang="ts">
  import { AppContextData, setAppData } from "../../lib/context";
  import Entry from "./Entry.svelte";

  type Props = AppContextData;
  const appData: Props = $props();

  // svelte-ignore state_referenced_locally
  setAppData(appData);
</script>

<Entry />
