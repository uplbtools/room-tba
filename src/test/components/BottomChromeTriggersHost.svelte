<script lang="ts">
	import MapToolsFlyout from '#lib/components/MapToolsFlyout.svelte';
	import MapLegend from '#lib/components/MapLegend.svelte';
	import LocationButton from '#lib/components/LocationButton.svelte';
	import AppContextTestShell from '@test/AppContextTestShell.svelte';
	import { loadedAppContext } from '@test/fixtures/app-context';
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
