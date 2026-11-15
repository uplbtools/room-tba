<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import AppMenu from '../status-bar/AppMenu.svelte';
	import mapIcon from '../../../assets/icons/map.svg?url';
	import plannerIcon from '../../../assets/icons/planner.svg?url';

	const links = [
		{ href: resolve('map'), label: 'Map', icon: mapIcon, routeId: '/(app)/map' },
		{
			href: resolve('map/planner'),
			label: 'Planner',
			icon: plannerIcon,
			routeId: '/(app)/map/planner'
		}
	];
	const onPlanner = $derived(page.route.id === '/(app)/map/planner');
</script>

<nav class="mobile-bottom-nav" aria-label="Primary">
	{#each links as link (link.href)}
		{@const active = onPlanner === (link.routeId === '/(app)/map/planner')}
		<a
			href={link.href}
			class="mobile-bottom-nav__item"
			class:mobile-bottom-nav__item--active={active}
			aria-current={active ? 'page' : undefined}
		>
			<img src={link.icon} alt="" width="24" height="24" decoding="async" />
			<span>{link.label}</span>
		</a>
	{/each}
	<AppMenu />
</nav>

<style>
	.mobile-bottom-nav {
		pointer-events: auto;
		box-sizing: border-box;
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		align-items: center;
		column-gap: 0.15rem;
		width: 100%;
		min-height: 3.75rem;
		padding: 0.4rem 0.4rem calc(0.4rem + env(safe-area-inset-bottom, 0px));
		border: none;
		border-top: 1px solid #f0eaeb;
		background: #fff;
		box-shadow: 0 -2px 12px rgb(0 0 0 / 0.06);
	}

	.mobile-bottom-nav__item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.2rem;
		min-width: 0;
		min-height: 3rem;
		margin: 0;
		padding: 0.3rem 0.1rem;
		border: none;
		border-radius: 0.75rem;
		background: transparent;
		color: #3a3032;
		font: inherit;
		font-size: 0.625rem;
		font-weight: 500;
		line-height: 1.1;
		cursor: pointer;
		text-decoration: none;
	}

	.mobile-bottom-nav__item img {
		width: 1.5rem;
		height: 1.5rem;
		opacity: 0.92;
	}

	.mobile-bottom-nav__item span {
		overflow: hidden;
		max-width: 100%;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mobile-bottom-nav__item--active {
		background: #feeaea;
		color: #8d1437;
	}

	.mobile-bottom-nav__item--active img {
		filter: invert(14%) sepia(62%) saturate(2800%) hue-rotate(325deg) brightness(85%) contrast(95%);
	}

	/* AppMenu ships its own chip styling for the status bar; here it has to read
     as the fifth tab, so strip the chip chrome and match .mobile-bottom-nav__item. */
	.mobile-bottom-nav :global(.app-menu) {
		display: flex;
		min-width: 0;
		justify-content: center;
		/* The wrapper is the grid cell; stretch it so the trigger can fill the same
       row box as the sibling tabs and their labels sit on one baseline. */
		align-self: stretch;
	}

	.mobile-bottom-nav :global(.app-menu__trigger) {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.2rem;
		width: 100%;
		min-width: 0;
		/* map-chrome-chip pins a fixed height; unpin it so the trigger grows to the
       same 58px as its siblings instead of sitting 10px short. */
		height: 100%;
		min-height: 3rem;
		margin: 0;
		padding: 0.3rem 0.1rem;
		border: none;
		border-radius: 0.75rem;
		background: transparent;
		box-shadow: none;
		color: #3a3032;
		font: inherit;
		font-size: 0.625rem;
		font-weight: 500;
		line-height: 1.1;
	}

	.mobile-bottom-nav :global(.app-menu__trigger svg) {
		width: 1.5rem;
		height: 1.5rem;
		opacity: 0.92;
	}

	.mobile-bottom-nav :global(.app-menu__trigger span) {
		overflow: hidden;
		max-width: 100%;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mobile-bottom-nav :global(.app-menu__trigger[aria-expanded='true']) {
		background: #feeaea;
		color: #8d1437;
	}
</style>
