<script lang="ts">
  import BuildingTypeFilterBar from "@ui/BuildingTypeFilterBar.svelte";
  import AppContextTestShell from "@test/AppContextTestShell.svelte";
  import { loadedAppContext } from "@test/fixtures/app-context";
</script>

<AppContextTestShell data={loadedAppContext()}>
  <BuildingTypeFilterBar />
</AppContextTestShell>
