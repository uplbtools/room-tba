<script lang="ts">
	import { getModalStore } from '#lib/utils/context.js';

	let {
		updatedAt,
		label = 'Last updated',
		lastEditedBy,
		entityType,
		entityId,
		entityName
	}: {
		updatedAt?: string | null;
		label?: string;
		lastEditedBy?: string | null;
		entityType?: string;
		entityId?: number;
		entityName?: string | null;
	} = $props();

	const modalStore = getModalStore();

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

{#if formatted || (entityType && entityId)}
	<p class="entity-last-updated">
		{#if formatted}{label}: {formatted}{attribution}.{/if}
		{#if entityType && entityId}
			<button
				type="button"
				class="entity-last-updated__history"
				onclick={() =>
					modalStore.openModal('entity-history', { entityType, entityId, name: entityName })}
				>Edit history</button
			>
		{/if}
	</p>
{/if}

<style>
	.entity-last-updated {
		margin: 0.35rem 0 0;
		font-size: 0.8rem;
		color: var(--text-muted, #64748b);
		line-height: 1.3;
	}

	.entity-last-updated__history {
		display: inline-block;
		background: none;
		border: none;
		padding: 0.875rem 0.375rem;
		margin: -0.875rem -0.375rem;
		font: inherit;
		color: inherit;
		text-decoration: underline;
		cursor: pointer;
	}
</style>
