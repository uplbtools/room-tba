<script lang="ts">
	import Globe from '@lucide/svelte/icons/globe';
	import CommunityBrandIcon from '$lib/components/community/CommunityBrandIcon.svelte';
	import type { ContributorPublicSocialLink } from '$lib/services/contribution/contributor-profile';
	import { socialLinkAccessibleLabel } from '$lib/utils/contributor-profile';

	type Props = {
		links: readonly ContributorPublicSocialLink[];
	};

	const { links }: Props = $props();
</script>

{#if links.length > 0}
	<nav class="contributor-social" aria-label="Contributor links">
		<ul class="contributor-social-list">
			{#each links as link}
				{@const accessibleLabel = socialLinkAccessibleLabel(link)}
				<li>
					<a
						class="contributor-social-link"
						href={link.url}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={accessibleLabel}
					>
						{#if link.kind === 'discord'}
							<CommunityBrandIcon brand="discord" size={17} />
						{:else if link.kind === 'messenger'}
							<CommunityBrandIcon brand="messenger" size={17} />
						{:else if link.kind === 'website'}
							<Globe size={17} aria-hidden="true" focusable="false" />
						{:else if link.kind === 'custom'}
							<span class="contributor-social-text-icon" aria-hidden="true">↗</span>
						{:else}
							<span class="contributor-social-text-icon" aria-hidden="true">
								{link.kind === 'github' ? 'GH' : link.kind === 'linkedin' ? 'in' : '?'}
							</span>
						{/if}
						<span class="contributor-social-label">{accessibleLabel}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<style>
	.contributor-social {
		min-width: 0;
	}

	.contributor-social-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.625rem;
		padding: 0;
		margin: 0;
		list-style: none;
		min-width: 0;
	}

	.contributor-social-list li {
		min-width: 0;
		max-width: 100%;
	}

	.contributor-social-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		max-width: 100%;
		min-width: 0;
		padding: 0.45rem 0.65rem;
		border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
		border-radius: 999px;
		color: hsl(5 53% 32%);
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.2;
		text-decoration: none;
	}

	.contributor-social-link:hover {
		background: color-mix(in srgb, currentColor 8%, transparent);
	}

	.contributor-social-link:focus-visible {
		outline: 3px solid hsl(39 100% 45%);
		outline-offset: 3px;
	}

	.contributor-social-label {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.contributor-social-text-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.0625rem;
		height: 1.0625rem;
		flex: 0 0 1.0625rem;
		font-size: 0.625rem;
		font-weight: 800;
		letter-spacing: -0.04em;
	}
</style>
