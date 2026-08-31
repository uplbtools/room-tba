<script lang="ts">
	import ContributorSocialLinks from '$lib/components/contributor/ContributorSocialLinks.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const profile = $derived(data.profile);
</script>


<main class="contributor-page">
	<article class="contributor-profile" aria-labelledby="contributor-name">
		<header class="contributor-header">
			<img
				class="contributor-avatar"
				src={profile.avatarUrl ?? '/profile.svg'}
				alt={profile.avatarUrl ? `${profile.displayName} profile avatar` : ''}
				width="96"
				height="96"
			/>
			<div class="contributor-identity">
				<h1 id="contributor-name">{profile.displayName}</h1>
				<span class="contributor-role">{profile.role}</span>
			</div>
		</header>

		{#if profile.bio}
			<p class="contributor-bio">{profile.bio}</p>
		{/if}

		<div class="contributor-social-wrap">
			<ContributorSocialLinks links={profile.socialLinks} />
		</div>
	</article>
</main>

<style>
	.contributor-page {
		display: flex;
		justify-content: center;
		width: 100%;
		min-width: 0;
		min-height: 100%;
		padding: clamp(1rem, 4vw, 3rem);
	}

	.contributor-profile {
		width: min(100%, 44rem);
		min-width: 0;
		padding: clamp(1.25rem, 4vw, 2.5rem);
		border: 1px solid hsl(0 0% 86%);
		border-radius: 1rem;
		background: hsl(0 0% 100%);
		box-shadow: 0 0.75rem 2rem hsl(0 0% 0% / 8%);
	}

	.contributor-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		min-width: 0;
	}

	.contributor-avatar {
		width: clamp(4.5rem, 20vw, 6rem);
		height: clamp(4.5rem, 20vw, 6rem);
		flex: 0 0 auto;
		border-radius: 50%;
		object-fit: cover;
		background: hsl(5 53% 96%);
	}

	.contributor-identity {
		min-width: 0;
	}

	h1 {
		margin: 0;
		color: hsl(0 0% 16%);
		font-size: clamp(1.5rem, 6vw, 2.25rem);
		line-height: 1.1;
		overflow-wrap: anywhere;
	}

	.contributor-role {
		display: inline-block;
		margin-top: 0.55rem;
		padding: 0.25rem 0.55rem;
		border: 1px solid hsl(5 53% 76%);
		border-radius: 999px;
		color: hsl(5 53% 32%);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		line-height: 1.1;
		text-transform: uppercase;
	}

	.contributor-bio {
		margin: 1.75rem 0 0;
		color: hsl(0 0% 28%);
		font-size: 1rem;
		line-height: 1.6;
		white-space: pre-line;
		overflow-wrap: anywhere;
	}

	.contributor-social-wrap {
		margin-top: 1.75rem;
	}

	@media (max-width: 22rem) {
		.contributor-page {
			padding: 0.75rem;
		}

		.contributor-profile {
			padding: 1rem;
		}

		.contributor-header {
			align-items: flex-start;
			gap: 0.75rem;
		}
	}
</style>
