<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setAppActions, setAppData, type AppContextData } from '#lib/utils/context.js';

	type Props = {
		data: AppContextData;
		children?: Snippet;
	};

	let { data, children }: Props = $props();

	setAppData(() => data);
	setAppActions({
		replaceEvent: () => {},
		removeEvent: () => {},
		upsertBuilding: () => {},
		upsertDorm: () => {},
		upsertCollege: () => {},
		upsertDivision: () => {},
		upsertOrganization: () => {},
		upsertPlace: () => {}
	});
</script>

{@render children?.()}
