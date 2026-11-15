<script lang="ts">
	import EntityExternalLink from '#lib/components/entity/EntityExternalLink.svelte';
	import EntityLastUpdated from '#lib/components/new/EntityLastUpdated.svelte';
	import SuggestEditButton from '#lib/components/new/SuggestEditButton.svelte';
	import type { getDivisionById } from '#lib/functions/divisions.remote.js';

	const { division }: { division: Awaited<ReturnType<typeof getDivisionById>> } = $props();
</script>

<div class="flex flex-col gap-3 p-6">
	<h2 class="text-2xl font-semibold">{division.divisionName}</h2>
	<SuggestEditButton
		data={{ id: division.id, version: division.version, divisionName: division.divisionName }}
	/>
	{#if division.websiteLink}
		<EntityExternalLink
			href={division.websiteLink}
			label="Website"
			ariaLabel={`Open ${division.divisionName} website (opens in new tab)`}
		/>
	{/if}
	<EntityLastUpdated
		updatedAt={division.updatedAt}
		entityType="division"
		entityId={division.id}
		entityName={division.divisionName}
	/>
</div>
