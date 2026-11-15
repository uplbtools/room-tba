<script lang="ts">
	import EntityExternalLink from '#lib/components/entity/EntityExternalLink.svelte';
	import EntityLastUpdated from '#lib/components/new/EntityLastUpdated.svelte';
	import SuggestEditButton from '#lib/components/new/SuggestEditButton.svelte';
	import type { getCollegeById } from '#lib/functions/colleges.remote.js';

	const { college }: { college: Awaited<ReturnType<typeof getCollegeById>> } = $props();
</script>

<div class="flex flex-col gap-3 p-6">
	<h2 class="text-2xl font-semibold">{college.collegeName}</h2>
	<SuggestEditButton
		data={{ id: college.id, version: college.version, collegeName: college.collegeName }}
	/>
	{#if college.websiteLink}
		<EntityExternalLink
			href={college.websiteLink}
			label="Website"
			ariaLabel={`Open ${college.collegeName} website (opens in new tab)`}
		/>
	{/if}
	<EntityLastUpdated
		updatedAt={college.updatedAt}
		entityType="college"
		entityId={college.id}
		entityName={college.collegeName}
	/>
</div>
