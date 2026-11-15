<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import {
		COMMUNITY_LINKS,
		DONATE_URL,
		LEGAL_LINKS,
		UPLB_TOOLS_URL
	} from '#lib/constants/content/links/community.js';
	import {
		CAMPUS_DATA_LICENSE_SUMMARY,
		DATA_LICENSE_FAQ_PATH
	} from '#lib/constants/data-license.js';
	import { WIKI_MINUTES } from '#lib/utils/wiki-handle.js';
	import { WIKI_INDEX_PATH, WIKI_PAGES } from '#lib/utils/wiki-pages.js';
	import type { LayoutData } from './$types';
	import './wiki.css';

	const { data, children }: { data: LayoutData; children: Snippet } = $props();

	const isIndex = $derived(page.url.pathname === WIKI_INDEX_PATH);
	const crumb = $derived<string | undefined>(page.data.crumb);
	const siblings = $derived(
		[
			...WIKI_PAGES.map((entry) => ({ href: entry.path, label: entry.title })),
			{ href: '/faq', label: 'Frequently asked questions' }
		].filter((entry) => entry.href !== page.url.pathname)
	);
	const externalCommunityLinks = COMMUNITY_LINKS.filter((link) => link.href !== UPLB_TOOLS_URL);
</script>

<div class="wiki-page">
	<a class="wiki-skip" href="#wiki-content">Skip to content</a>

	<header class="wiki-masthead">
		<a class="wiki-brand" href="/wiki">
			<img
				src="/favicon.svg"
				alt=""
				width="28"
				height="28"
				decoding="async"
				class="wiki-brand__logo"
			/>
			<span class="wiki-brand__name">Room TBA</span>
			<span class="wiki-brand__label">Wiki</span>
		</a>
		<nav class="wiki-masthead__nav" aria-label="Wiki">
			<a href="/wiki" aria-current={isIndex ? 'page' : undefined}>All guides</a>
			<a href="/faq">Help &amp; FAQ</a>
			<a class="wiki-masthead__map" href="/">Open the map</a>
		</nav>
	</header>

	<div class="wiki-subbar">
		<nav class="wiki-breadcrumb" aria-label="Breadcrumb">
			<ol>
				<li><a href="/">Home</a></li>
				<li>
					{#if isIndex}
						<span aria-current="page">Wiki</span>
					{:else}
						<a href="/wiki">Wiki</a>
					{/if}
				</li>
				{#if crumb}
					<li><span aria-current="page">{crumb}</span></li>
				{/if}
			</ol>
		</nav>
		{#if !isIndex}
			<p class="wiki-readtime">{WIKI_MINUTES} min read</p>
		{/if}
	</div>

	<main id="wiki-content" tabindex="-1">
		{@render children()}
	</main>

	{#if !isIndex}
		<nav class="wiki-seealso" aria-labelledby="wiki-seealso-heading">
			<h2 id="wiki-seealso-heading">See also</h2>
			<ul>
				{#each siblings as entry (entry.href)}
					<li><a href={entry.href}>{entry.label}</a></li>
				{/each}
				<li><a href="/wiki">Wiki index</a></li>
			</ul>
		</nav>
	{/if}

	{#if data.sponsors.length > 0}
		<aside class="sponsor-strip" aria-label="Sponsors">
			<span class="sponsor-strip__lede">Room TBA is supported by</span>
			<span class="sponsor-strip__logos">
				{#each data.sponsors as sponsor (sponsor.id)}
					<a
						href="/sponsors"
						class="sponsor-strip__sponsor"
						title={`${sponsor.name} (see all sponsors)`}
					>
						<img src={sponsor.logo} alt={sponsor.name} width="24" height="24" loading="lazy" />
						<span>{sponsor.name}</span>
					</a>
				{/each}
			</span>
		</aside>
	{/if}

	<footer class="site-footer">
		<nav class="site-footer__nav" aria-label="Site links">
			<span class="site-footer__group">
				<a href="/wiki">Wiki</a>
				{#each LEGAL_LINKS as link (link.href)}
					<a href={link.href}>{link.label}</a>
				{/each}
				<a href="/sponsors">Sponsors</a>
				<a href={DONATE_URL}>Donate</a>
			</span>
			<span class="site-footer__sep" aria-hidden="true">/</span>
			<span class="site-footer__group">
				<a href={UPLB_TOOLS_URL} target="_blank" rel="noopener noreferrer">UPLB Tools</a>
				{#each externalCommunityLinks as link (link.href)}
					<a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
				{/each}
			</span>
		</nav>
		<p class="site-footer__note">
			Room TBA is a student-run project under
			<a href={UPLB_TOOLS_URL} target="_blank" rel="noopener noreferrer">UPLB Tools</a>. It isn't an
			official UPLB website.
		</p>
		<p class="site-footer__note">
			{CAMPUS_DATA_LICENSE_SUMMARY}
			<a href={DATA_LICENSE_FAQ_PATH}>Data licenses</a>
		</p>
	</footer>
</div>

<style>
	.sponsor-strip {
		margin-top: 2.5rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		color: var(--wiki-ink-2);
	}

	.sponsor-strip__lede {
		font-weight: 600;
	}

	.sponsor-strip__logos {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem 0.75rem;
	}

	.sponsor-strip__sponsor {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--wiki-accent);
		font-weight: 600;
		text-decoration: none;
	}

	.sponsor-strip__sponsor img {
		max-width: 1.5rem;
		max-height: 1.5rem;
		border-radius: 0.25rem;
		object-fit: contain;
	}

	.sponsor-strip__sponsor:hover span,
	.sponsor-strip__sponsor:focus-visible span {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.site-footer {
		margin-top: 2.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--wiki-rule);
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		font-size: 0.8125rem;
		line-height: 1.5;
		color: var(--wiki-ink-2);
	}

	.site-footer__nav,
	.site-footer__group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem 0.625rem;
	}

	.site-footer__group {
		display: inline-flex;
	}

	.site-footer__sep {
		color: var(--wiki-rule-strong);
		user-select: none;
	}

	.site-footer a {
		color: var(--wiki-accent);
		font-weight: 600;
		text-decoration: none;
	}

	.site-footer a:hover,
	.site-footer a:focus-visible {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.site-footer__note {
		margin: 0;
		max-width: 36rem;
	}
</style>
