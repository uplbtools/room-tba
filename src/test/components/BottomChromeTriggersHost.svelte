<script lang="ts">
  import MapToolsFlyout from "@ui/MapToolsFlyout.svelte";
  import MapLegend from "@ui/MapLegend.svelte";
  import LocationButton from "@ui/LocationButton.svelte";
  import AppContextTestShell from "@test/AppContextTestShell.svelte";
  import { loadedAppContext } from "@test/fixtures/app-context";
</script>

<!-- The bottom chrome trigger row as Entry.svelte mounts it, so the adjacent
     icons can be compared the way a user sees them. -->
<AppContextTestShell data={loadedAppContext()}>
  <div class="bottom-chrome__triggers">
    <MapToolsFlyout />
    <MapLegend trigger="chip" />
    <LocationButton embedded />
  </div>
</AppContextTestShell>
