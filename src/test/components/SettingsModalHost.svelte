<script lang="ts">
	import SettingsModal from '#lib/components/modal/SettingsModal.svelte';
	import AppContextTestShell from '@test/AppContextTestShell.svelte';
	import { loadedAppContext } from '@test/fixtures/app-context';
</script>

<AppContextTestShell data={loadedAppContext()}>
	<SettingsModal />
</AppContextTestShell>
