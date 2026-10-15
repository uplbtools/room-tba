<script lang="ts">
	import { OSM_COPYRIGHT_URL } from '#lib/constants/data-license.js';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<main class="route-page">
	<nav class="route-crumb">
		<a href="/">Room TBA</a>
	</nav>

	<header class="route-head">
		<p class="route-kicker">Walking route</p>
		<h1>{data.fromName} to {data.toName}</h1>
		{#if data.stats}
			<p class="route-stats">
				<span>{data.stats.distance}</span>
				<span aria-hidden="true">·</span>
				<span>{data.stats.duration} on foot</span>
			</p>
		{/if}
	</header>

	{#if data.stats}
		<section class="route-body">
			{#if data.aiDescription}
				<p class="route-lede">{data.aiDescription}</p>
			{:else}
				<ol class="route-steps">
					{#each data.steps as step, i (i)}
						<li>{step}</li>
					{/each}
				</ol>
			{/if}

			<div class="route-actions">
				<a class="route-btn route-btn--primary" href={data.mapUrl}>Open on the map</a>
				{#each data.contextLinks as link (link.href)}
					<a class="route-btn" href={link.href}>{link.label}</a>
				{/each}
			</div>

			<p class="route-note">
				Distance and time come from
				<a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
				footpaths and assume an unhurried walk. Campus shortcuts and closed gates are not accounted for.
			</p>
		</section>
	{:else}
		<section class="route-body">
			<p class="route-lede">
				{data.samePlace
					? 'That is the same place twice. Pick a different destination.'
					: 'No walking route could be worked out between these two right now. The routing service may be unavailable.'}
			</p>
			<div class="route-actions">
				<a class="route-btn route-btn--primary" href="/">Open the map</a>
			</div>
		</section>
	{/if}
</main>

<style>
	.route-page {
		width: min(48rem, calc(100% - 2rem));
		margin: 0 auto;
		padding: 2rem 0 4rem;
	}

	.route-crumb a {
		color: hsl(5, 53%, 32%);
		font-size: 0.8125rem;
		font-weight: 600;
		text-decoration: none;
	}

	.route-head {
		margin-top: 1rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid hsl(0, 0%, 88%);
	}

	.route-kicker {
		margin: 0;
		color: hsl(5, 53%, 36%);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.route-head h1 {
		margin: 0.375rem 0 0;
		font-size: clamp(1.5rem, 4vw, 2.125rem);
		line-height: 1.15;
	}

	.route-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0.625rem 0 0;
		color: hsl(0, 0%, 35%);
		font-size: 0.9375rem;
		font-weight: 600;
	}

	.route-lede {
		margin: 1.5rem 0 0;
		font-size: 1.0625rem;
		line-height: 1.6;
	}

	.route-steps {
		margin: 1.5rem 0 0;
		padding-left: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		line-height: 1.55;
	}

	.route-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1.75rem;
	}

	.route-btn {
		padding: 0.6rem 1rem;
		border: 1px solid hsl(5, 28%, 80%);
		border-radius: 0.625rem;
		color: hsl(5, 53%, 32%);
		font-size: 0.875rem;
		font-weight: 650;
		text-decoration: none;
	}

	.route-btn--primary {
		border-color: transparent;
		background: hsl(5, 53%, 32%);
		color: white;
	}

	.route-note {
		margin: 2rem 0 0;
		color: hsl(0, 0%, 45%);
		font-size: 0.8125rem;
		line-height: 1.5;
	}
</style>
