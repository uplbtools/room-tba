<script lang="ts">
	import type { WikiProvenance } from '#lib/utils/wiki-provenance.js';

	type Props = {
		data: {
			provenance: (WikiProvenance & { correctionUrl: string }) | null;
			dataProvenance: WikiProvenance | null;
		};
	};

	const { data }: Props = $props();
	const { provenance, dataProvenance } = $derived(data);

	const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'long' });
	const format = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : null);
	const dataChangedLabel = $derived(format(dataProvenance?.lastEdited ?? null));
</script>

{#if provenance}
	<div class="wiki-provenance">
		<p class="wiki-provenance__line">
			{#if provenance.authors.length > 0}
				<span class="wiki-provenance__authors">
					By{' '}{#each provenance.authors as author, i}{i > 0 ? ', ' : ''}{#if author.github}<a
								class="wiki-link"
								href={`https://github.com/${author.github}`}
								target="_blank"
								rel="noopener noreferrer">{author.name}</a
							>{:else}{author.name}{/if}{/each}
				</span>
			{/if}
			{#if provenance.lastEdited}
				<span>
					Page edited <time datetime={provenance.lastEdited}>{format(provenance.lastEdited)}</time>
					({provenance.revisions}
					{provenance.revisions === 1 ? 'revision' : 'revisions'})
				</span>
			{/if}
			<a class="wiki-link" href={provenance.historyUrl} target="_blank" rel="noopener noreferrer"
				>History</a
			>
			<a class="wiki-link" href={provenance.editUrl} target="_blank" rel="noopener noreferrer"
				>Edit on GitHub</a
			>
			<a class="wiki-link" href={provenance.correctionUrl} target="_blank" rel="noopener noreferrer"
				>Report a correction</a
			>
		</p>
		{#if dataProvenance}
			<p class="wiki-provenance__verify" role="note">
				<strong>These values need verification.</strong> They come from Room TBA’s own data file,
				not from a published official notice.
				{#if dataChangedLabel}
					<span>
						Last updated in Room TBA on <time datetime={dataProvenance.lastEdited}
							>{dataChangedLabel}</time
						>.
					</span>
				{/if}
				Confirm with the office concerned before relying on them, and
				<a
					class="wiki-link"
					href={provenance.correctionUrl}
					target="_blank"
					rel="noopener noreferrer">report a correction</a
				>
				if one is out of date.
			</p>
		{/if}
	</div>
{/if}

<style>
	.wiki-provenance__line {
		display: flex;
		flex-wrap: wrap;
		gap: 0 var(--wiki-space-md);
		margin: var(--wiki-space-md) 0 0;
		color: var(--wiki-ink-2);
		font-size: var(--wiki-text-md);
		line-height: 1.6;
	}

	.wiki-provenance__authors {
		color: var(--wiki-ink);
		font-weight: 600;
	}

	.wiki-provenance__verify {
		max-width: var(--wiki-measure);
		margin: var(--wiki-space-sm) 0 0;
		padding: var(--wiki-space-xs) var(--wiki-space-sm);
		border-left: 3px solid var(--wiki-accent);
		background: var(--wiki-accent-soft);
		color: var(--wiki-ink);
		font-size: var(--wiki-text-md);
		line-height: 1.55;
	}
</style>
