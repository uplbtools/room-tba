<script lang="ts">
	import { ROUTE_LINE_CODES, ROUTE_SIGNBOARDS } from '#lib/constants/map/jeepney-routes.js';
	import { darkenForWhiteText } from '#lib/utils/color-contrast.js';
	import { transitRouteKind } from '#lib/utils/transit/transit-route-kind.js';
	import TransitSignboard from './TransitSignboard.svelte';

	const { route }: { route: { id: string; name: string; color: string } } = $props();

	const codes = $derived(ROUTE_LINE_CODES[route.id]);
	const signboard = $derived(ROUTE_SIGNBOARDS[route.id]);
</script>

<span class="mr-2 inline-flex shrink-0 gap-0.5 align-middle" aria-hidden="true">
	{#if codes}
		{#each codes as code (code)}
			<span
				class="rounded px-1.5 py-px text-[0.6875rem] font-extrabold tracking-wide text-white"
				style:background-color={darkenForWhiteText(route.color)}>{code}</span
			>
		{/each}
	{:else if signboard}
		<TransitSignboard lines={signboard} kind={transitRouteKind(route)} small />
	{:else}
		<span class="size-2.5 rounded-full" style:background-color={route.color}></span>
	{/if}
</span>
