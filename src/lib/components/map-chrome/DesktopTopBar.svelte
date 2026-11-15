<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getAdminAuthStore } from '#lib/utils/context.js';
	import AppMenu from '../status-bar/AppMenu.svelte';

	const adminAuthStore = getAdminAuthStore();

	const links = [
		{ href: resolve('map'), label: 'Map', routeId: '/(app)/map' },
		{ href: resolve('map/planner'), label: 'Planner', routeId: '/(app)/map/planner' }
	];

	function handleSignIn() {
		if (adminAuthStore.username) {
			adminAuthStore.openAccountSettings();
			return;
		}
		adminAuthStore.openLogin('signin');
	}

	const signInLabel = $derived(adminAuthStore.username ? 'Account' : 'Contributor sign in');
</script>

<header class="desktop-top-bar" aria-label="App navigation">
	<a href={resolve('map')} class="desktop-top-bar__brand" aria-label="Room TBA home">
		<img
			src="/logo-inverted.png"
			alt=""
			width="24"
			height="24"
			class="desktop-top-bar__logo"
			decoding="async"
		/>
		<span class="desktop-top-bar__title">Room TBA</span>
	</a>

	<nav class="desktop-top-bar__nav" aria-label="Primary">
		{#each links as link (link.href)}
			{@const active = page.route.id === link.routeId}
			<a
				href={link.href}
				class="desktop-top-bar__link"
				class:desktop-top-bar__link--active={active}
				aria-current={active ? 'page' : undefined}
			>
				{link.label}
			</a>
		{/each}
		<AppMenu />
		<button type="button" class="desktop-top-bar__signin" onclick={handleSignIn}>
			{signInLabel}
		</button>
	</nav>
</header>

<style>
	.desktop-top-bar {
		pointer-events: auto;
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		box-sizing: border-box;
		width: 100%;
		height: var(--desktop-top-bar-height, 3.5625rem);
		padding: 0 clamp(0.75rem, 1.5vw, 1.25rem);
		background: #f9f6f6;
		border-bottom: 1px solid hsl(5 12% 88%);
		z-index: 1;
	}

	.desktop-top-bar__brand {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		border: none;
		background: transparent;
		text-decoration: none;
		cursor: pointer;
		text-align: left;
	}

	.desktop-top-bar__logo {
		width: 24px;
		height: 24px;
		border-radius: 6px;
	}

	.desktop-top-bar__title {
		font-family: 'DM Sans', Inter, system-ui, sans-serif;
		font-size: clamp(0.95rem, 1.15vw, 1.09rem);
		font-weight: 700;
		line-height: 1;
		color: #7e272c;
	}

	.desktop-top-bar__nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 4px;
		min-width: 0;
	}

	.desktop-top-bar__link {
		margin: 0;
		padding: 0.45rem clamp(0.5rem, 0.9vw, 0.75rem);
		border: none;
		border-radius: 10px;
		background: transparent;
		color: #332529;
		font: inherit;
		font-size: clamp(0.8125rem, 0.95vw, 0.875rem);
		text-decoration: none;
		cursor: pointer;
	}

	.desktop-top-bar__link--active {
		background: #feeaea;
	}

	.desktop-top-bar__link:hover {
		background: #feeaea;
	}

	.desktop-top-bar__signin {
		margin: 0 0 0 4px;
		padding: 0.45rem clamp(0.75rem, 1.2vw, 1rem);
		border: none;
		border-radius: 10px;
		background: #8d1437;
		color: #fff;
		font: inherit;
		font-size: clamp(0.8125rem, 0.95vw, 0.875rem);
		cursor: pointer;
	}
</style>
