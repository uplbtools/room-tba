<script lang="ts">
	import EntityPanelHeader from '#lib/components/entity/EntityPanelHeader.svelte';
</script>

<EntityPanelHeader closeAriaLabel="Close building" onclose={() => {}}>
	{#snippet trailing()}
		Very Long Building Name That Should Truncate In The Header
	{/snippet}
</EntityPanelHeader>
