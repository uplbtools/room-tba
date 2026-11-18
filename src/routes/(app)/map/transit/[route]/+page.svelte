<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import { onMount } from 'svelte';
	import InfoPanel from '#lib/components/new/InfoPanel.svelte';
	import { getTransitRoute } from '#lib/functions/transit.remote.js';
	import { getMapStore } from '#lib/utils/context.js';
	import TransitRoute from './TransitRoute.svelte';

	const { params } = $props();
	const map = getMapStore();

	const route = $derived(getTransitRoute(params.route));
	const reversed = $derived(page.url.searchParams.get('dir') === 'reverse');

	function reverse(next: boolean) {
		const url = new URL(page.url);
		if (next) url.searchParams.set('dir', 'reverse');
		else url.searchParams.delete('dir');
		void goto(url, { replaceState: true, reset: false });
	}

	afterNavigate(fitRoute);

	onMount(async () => {
		if (navigating.type) return;
		await fitRoute();
	});

	async function fitRoute() {
		const { stops } = await route;
		if (stops.length === 0) return;
		const lons = stops.map((stop) => stop.lon);
		const lats = stops.map((stop) => stop.lat);
		map.fitBounds([
			[Math.min(...lons), Math.min(...lats)],
			[Math.max(...lons), Math.max(...lats)]
		]);
	}
</script>

<InfoPanel>
	<svelte:boundary>
		{#snippet failed()}
			<p class="p-6 text-sm">Couldn't load this route.</p>
		{/snippet}
		{#snippet pending()}
			Loading...
		{/snippet}
		<TransitRoute route={await route} {reversed} onreverse={reverse} />
	</svelte:boundary>
</InfoPanel>
