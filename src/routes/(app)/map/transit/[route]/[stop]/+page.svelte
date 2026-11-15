<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { navigating } from '$app/state';
	import { onMount } from 'svelte';
	import InfoPanel from '#lib/components/new/InfoPanel.svelte';
	import { getTransitRoute, getTransitRoutes } from '#lib/functions/transit.remote.js';
	import { getMapStore } from '#lib/utils/context.js';
	import { routesAtStop } from '#lib/utils/transit/transit-direction.js';
	import JeepStop from './JeepStop.svelte';

	const { params } = $props();
	const map = getMapStore();

	const index = $derived(Number(params.stop) - 1);
	const route = $derived(getTransitRoute(params.route));

	afterNavigate(centerStop);

	onMount(async () => {
		if (navigating.type) return;
		await centerStop();
	});

	async function centerStop() {
		const stop = (await route).stops[index];
		if (stop) map.centerMarker([stop.lon, stop.lat], 17);
	}
</script>

<InfoPanel>
	<svelte:boundary>
		{#snippet failed()}
			<p class="p-6 text-sm">Couldn't load this stop.</p>
		{/snippet}
		{#snippet pending()}
			Loading...
		{/snippet}
		{@const stop = (await route).stops[index]}
		{#if stop}
			<JeepStop
				route={await route}
				{index}
				entries={routesAtStop(await getTransitRoutes(), stop)}
			/>
		{:else}
			<p class="p-6 text-sm">This route has no stop {params.stop}.</p>
		{/if}
	</svelte:boundary>
</InfoPanel>
