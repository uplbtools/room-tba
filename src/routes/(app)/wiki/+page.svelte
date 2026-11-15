<script lang="ts">
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<script src="/wiki-search.js" defer></script>
</svelte:head>

<article class="wiki-article">
	<header class="article-hero">
		<h1 class="wiki-title">The campus details nobody explains</h1>
		<p class="wiki-lede">
			These guides are built from Room TBA’s schedule and campus data. Each article shows its
			evidence, who wrote it and the cases where the pattern breaks. If you spot a mistake, every
			article has a “Report a correction” link.
		</p>
	</header>

	<section aria-labelledby="articles-heading">
		<h2 id="articles-heading">Articles</h2>
		<form class="wiki-search" role="search" id="wiki-search" hidden>
			<label for="wiki-search-input">Filter articles</label>
			<input
				id="wiki-search-input"
				type="search"
				placeholder="Try curfew, jeep or TBA"
				autocomplete="off"
				enterkeyhint="search"
			/>
			<p class="wiki-search__status" role="status" aria-live="polite"></p>
		</form>
		<dl class="wiki-index" id="wiki-index">
			{#each data.articles as article}
				<div
					class="wiki-index__item"
					data-search={`${article.title} ${article.kicker} ${article.blurb}`.toLowerCase()}
				>
					<dt><a href={article.path}>{article.title}</a></dt>
					<dd>
						<p class="wiki-index__blurb">{article.blurb}</p>
						<p class="wiki-index__meta">
							{article.kicker}{#if article.lastEdited}. Updated {article.lastEdited}{/if}{#if article.authors}.
								By {article.authors}{/if}
						</p>
					</dd>
				</div>
			{/each}
		</dl>
	</section>

	<section aria-labelledby="resources-heading">
		<h2 id="resources-heading">More UPLB resources</h2>
		<ul>
			<li>
				<a href="/">Open the Room TBA map</a>
			</li>
			<li>
				<a href="https://www.uplb.tools/transparency" target="_blank" rel="noopener noreferrer">
					Transparency report</a
				>
				(where donation and sponsor money goes)
				<span aria-hidden="true">↗</span>
			</li>
			<li>
				<a href="https://guide.stimmie.dev" target="_blank" rel="noopener noreferrer">
					UPLB resources and guides</a
				> <span aria-hidden="true">↗</span>
			</li>
			<li>
				<a href="https://uplb.tools" target="_blank" rel="noopener noreferrer"> More UPLB Tools</a>
				<span aria-hidden="true">↗</span>
			</li>
		</ul>
	</section>
</article>

<style>
	.wiki-index {
		max-width: var(--wiki-measure);
		margin: 0;
	}

	.wiki-index__item {
		margin-top: 1.25rem;
		padding-top: 0.85rem;
		border-top: 1px solid var(--wiki-rule);
	}

	.wiki-index dt {
		font-family: var(--wiki-font-display);
		font-size: 1.1875rem;
		font-weight: 700;
		line-height: 1.3;
	}

	.wiki-index dd {
		margin: 0.35rem 0 0;
	}

	.wiki-index__blurb {
		margin: 0;
	}

	.wiki-index__meta {
		margin: 0.35rem 0 0;
		color: var(--wiki-ink-2);
		font-size: var(--wiki-text-md);
	}

	.wiki-search {
		max-width: var(--wiki-measure);
		margin: var(--wiki-space-sm) 0 0;
	}

	.wiki-search[hidden] {
		display: none;
	}

	.wiki-search label {
		display: block;
		margin-bottom: var(--wiki-space-2xs);
		color: var(--wiki-ink-2);
		font-size: var(--wiki-text-md);
	}

	.wiki-search input {
		box-sizing: border-box;
		width: 100%;
		min-height: 2.75rem;
		padding: 0 var(--wiki-space-sm);
		border: 1px solid var(--wiki-rule-strong);
		border-radius: 0.5rem;
		background: var(--wiki-paper);
		color: var(--wiki-ink);
		font: inherit;
		font-size: 1rem;
	}

	.wiki-search__status {
		min-height: 1.25rem;
		margin: var(--wiki-space-2xs) 0 0;
		color: var(--wiki-ink-2);
		font-size: var(--wiki-text-md);
	}

	@media print {
		.wiki-search {
			display: none;
		}
	}
</style>
