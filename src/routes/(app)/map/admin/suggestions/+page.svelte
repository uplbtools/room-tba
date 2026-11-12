<script lang="ts">
	import InfoPanel from '#lib/components/new/InfoPanel.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<InfoPanel>This is admin... HOHOHO</InfoPanel>
