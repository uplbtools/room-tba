<script lang="ts">
	import BuildingTypeFilterBar from '#lib/components/BuildingTypeFilterBar.svelte';
	import AppContextTestShell from '@test/AppContextTestShell.svelte';
	import { loadedAppContext } from '@test/fixtures/app-context';
</script>

<AppContextTestShell data={loadedAppContext()}>
	<BuildingTypeFilterBar />
</AppContextTestShell>
