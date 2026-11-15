<script lang="ts">
	import WikiProvenance from '../WikiProvenance.svelte';
	import type { PageData } from './$types';
	import {
		EMERGENCY_HOTLINE_CATEGORIES,
		emergencyHotlineTel,
		formatHotlineNumber
	} from '#lib/constants/content/emergency-hotlines.js';

	const { data }: { data: PageData } = $props();
</script>

<article class="wiki-article">
	<header class="article-hero">
		<h1 class="wiki-title">Emergency hotlines around UPLB</h1>
		<p class="wiki-lede">
			Call the service that can help. This directory is bundled in Room TBA’s app menu too, so it
			stays available without a network connection.
		</p>
		<WikiProvenance {data} />
	</header>

	{#each EMERGENCY_HOTLINE_CATEGORIES as category}
		{@const id = `hotlines-${category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
		<section aria-labelledby={id}>
			<h2 {id}>{category.name}</h2>
			<dl>
				{#each category.entries as entry}
					<dt>{entry.name}</dt>
					<dd>
						{#each entry.numbers as number, index}
							{index > 0 ? ', ' : ''}
							<a
								href={emergencyHotlineTel(number)}
								aria-label={`Call ${entry.name} at ${formatHotlineNumber(number)}`}
							>
								{formatHotlineNumber(number)}
							</a>
						{/each}
					</dd>
				{/each}
			</dl>
		</section>
	{/each}
</article>

<style>
	dl {
		margin: 0;
	}

	dt {
		margin-top: 0.875rem;
		font-weight: 700;
	}

	dd {
		margin: 0.25rem 0 0;
	}
</style>
