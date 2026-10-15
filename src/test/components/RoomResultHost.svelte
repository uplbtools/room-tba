<script lang="ts">
	import RoomResult from '#lib/components/room/RoomResult.svelte';
	import AppContextTestShell from '@test/AppContextTestShell.svelte';
	import { loadedAppContext } from '@test/fixtures/app-context';
</script>

<AppContextTestShell data={loadedAppContext()}>
	<RoomResult />
</AppContextTestShell>
