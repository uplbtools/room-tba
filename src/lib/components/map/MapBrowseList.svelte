<script lang="ts">
	import type { Snippet } from 'svelte';

	type BrowseEntry = { href: string; label: string; description?: string | null };

	const {
		heading,
		entries,
		empty
	}: {
		heading: string;
		entries: BrowseEntry[];
		empty?: Snippet;
	} = $props();
</script>

<section class="map-browse">
	<h2 class="map-browse__heading">{heading}</h2>
	{#if entries.length === 0}
		{#if empty}
			{@render empty()}
		{:else}
			<p class="map-browse__empty">
				Campus data is still syncing. This list fills in once the offline cache has caught up.
			</p>
		{/if}
	{:else}
		<ul class="map-browse__list">
			{#each entries as entry (entry.href)}
				<li>
					<a href={entry.href}>{entry.label}</a>
					{#if entry.description}
						<span class="map-browse__description">{entry.description}</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.map-browse {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		overflow-y: auto;
		padding: 0.75rem;
	}

	.map-browse__heading {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 700;
	}

	.map-browse__empty {
		margin: 0;
		color: hsl(0, 0%, 45%);
		font-size: 0.8125rem;
		line-height: 1.5;
	}

	.map-browse__list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.map-browse__list li {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.map-browse__list a {
		color: hsl(5, 53%, 32%);
		font-size: 0.875rem;
		font-weight: 600;
		text-decoration: none;
	}

	.map-browse__description {
		color: hsl(0, 0%, 45%);
		font-size: 0.75rem;
	}
</style>
