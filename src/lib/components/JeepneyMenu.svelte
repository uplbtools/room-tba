<script lang="ts">
	import TransitRoutePanel from '#lib/components/TransitRoutePanel.svelte';

	type Props = {
		embedded?: boolean;
	};

	let { embedded = false }: Props = $props();
</script>

{#if embedded}
	<TransitRoutePanel />
{/if}
