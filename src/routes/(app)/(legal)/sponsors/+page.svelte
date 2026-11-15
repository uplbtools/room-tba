<script lang="ts">
	import { onMount } from 'svelte';
	import {
		DISCORD_URL,
		GITHUB_ROOM_TBA_URL,
		MESSENGER_CONTRIBUTE_TARGET
	} from '#lib/constants/content/links/community.js';
	import { getByTier, type Sponsor } from '#lib/utils/sponsors.js';
	import { trackSponsorImpression } from '#lib/utils/sponsor-tracking.js';
	import sponsorsData from '../../../../../static/sponsors.json';

	const sponsors = sponsorsData.sponsors as Sponsor[];
	const gold = getByTier(sponsors, 'gold');
	const silver = getByTier(sponsors, 'silver');
	const listed = [...getByTier(sponsors, 'bronze'), ...getByTier(sponsors, 'promo')];
	const studentOrgs = getByTier(sponsors, 'student-org');
	const shown = [...gold, ...silver, ...listed, ...studentOrgs];

	onMount(() => {
		for (const sponsor of shown) trackSponsorImpression(sponsor.id, 'sponsors_page');
	});
</script>

<h1>Room TBA is supported by</h1>
<p>
	Room TBA is a free, open-source campus map run by student volunteers. Curated local sponsors like
	food spots, boarding houses and printing shops keep it running. Sponsor placements use no ad
	networks or tracking pixels, and every placement is clearly labeled “Sponsored.”
</p>

{#if shown.length === 0}
	<p>No active sponsors yet. Your business could be the first.</p>
{/if}

{#if gold.length > 0}
	<h2>Gold</h2>
	{#each gold as sponsor (sponsor.id)}
		<a
			class="card card--gold"
			href={sponsor.url}
			target="_blank"
			rel="noopener noreferrer sponsored"
			aria-label="Visit {sponsor.name}, sponsor"
		>
			<img src={sponsor.logo} alt="" width="64" height="64" loading="lazy" />
			<span class="card__body">
				<span class="card__name">{sponsor.name}</span>
				{#if sponsor.tagline}<span class="card__tagline">{sponsor.tagline}</span>{/if}
			</span>
		</a>
	{/each}
{/if}

{#if silver.length > 0}
	<h2>Silver</h2>
	<div class="grid">
		{#each silver as sponsor (sponsor.id)}
			<a
				class="card"
				href={sponsor.url}
				target="_blank"
				rel="noopener noreferrer sponsored"
				aria-label="Visit {sponsor.name}, sponsor"
			>
				<img src={sponsor.logo} alt="" width="48" height="48" loading="lazy" />
				<span class="card__body">
					<span class="card__name">{sponsor.name}</span>
					{#if sponsor.tagline}<span class="card__tagline">{sponsor.tagline}</span>{/if}
				</span>
			</a>
		{/each}
	</div>
{/if}

{#if listed.length > 0}
	<h2>Bronze and campus promos</h2>
	<ul>
		{#each listed as sponsor (sponsor.id)}
			<li>
				<a href={sponsor.url} target="_blank" rel="noopener noreferrer sponsored">{sponsor.name}</a>
				{#if sponsor.tagline}<span>, {sponsor.tagline}</span>{/if}
			</li>
		{/each}
	</ul>
{/if}

{#if studentOrgs.length > 0}
	<h2>Student orgs</h2>
	<p>Student org events get free promotion. No payment involved.</p>
	<ul>
		{#each studentOrgs as sponsor (sponsor.id)}
			<li><a href={sponsor.url} target="_blank" rel="noopener noreferrer">{sponsor.name}</a></li>
		{/each}
	</ul>
{/if}

<h2>Where the money goes</h2>
<p>
	Sponsor revenue covers operational expenses first (hosting, database, domains, promotion), then
	contributor payouts and core team incentives. The full breakdown, tier pricing and impression
	guarantees live in the
	<a
		href="{GITHUB_ROOM_TBA_URL}/blob/main/docs/funding-model.md"
		target="_blank"
		rel="noopener noreferrer">funding model</a
	>
	and
	<a
		href="{GITHUB_ROOM_TBA_URL}/blob/main/docs/ad-policy.md"
		target="_blank"
		rel="noopener noreferrer">ad policy</a
	>.
</p>

<h2>Become a sponsor</h2>
<p>
	Run a food spot, boarding house, printing shop or other student-relevant business near UPLB? Reach
	the team via
	<a href={MESSENGER_CONTRIBUTE_TARGET} target="_blank" rel="noopener noreferrer">Messenger</a>
	or <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">Discord</a>. Not a business?
	You can also make a <a href="/donate">one-time donation</a>.
</p>

<style>
	.card {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		margin-top: 0.75rem;
		padding: 1rem;
		border-radius: 0.75rem;
		border: 1px solid hsl(5 30% 88%);
		background: hsl(5 20% 98%);
		text-decoration: none;
		color: inherit;
	}

	.card--gold {
		border-color: hsl(42 65% 60%);
		background: hsl(42 80% 97%);
	}

	.card img {
		border-radius: 0.5rem;
		object-fit: contain;
		flex-shrink: 0;
	}

	.card__body {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.card__name {
		font-weight: 700;
		color: hsl(5, 53%, 32%);
	}

	.card__tagline {
		font-size: 0.875rem;
		font-weight: 400;
		color: hsl(0, 0%, 38%);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
		gap: 0.75rem;
	}
</style>
