<script lang="ts">
	let {
		updatedAt,
		label = 'Last updated',
		lastEditedBy
	}: {
		updatedAt: string | null | undefined;
		label?: string;
		lastEditedBy: string | null;
	} = $props();

	const formatted = $derived.by(() => {
		if (!updatedAt) return null;
		const date = new Date(updatedAt);
		if (Number.isNaN(date.getTime())) return null;
		return date.toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	});

	const attribution = $derived.by(() => {
		const name = lastEditedBy?.trim();
		return name ? ` by ${name}` : '';
	});
</script>

{#if formatted}
	<p class="entity-last-updated">
		{label}: {formatted}{attribution}
	</p>
{/if}

<style>
	.entity-last-updated {
		margin: 0.35rem 0 0;
		font-size: 0.8rem;
		color: var(--text-muted, #64748b);
		line-height: 1.3;
	}
</style>
