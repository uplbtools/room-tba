<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import InfoPanel from '#lib/components/new/InfoPanel.svelte';
	import { getWalkingRoute } from '#lib/functions/directions.remote.js';
	import { getMapStore, getUserLocation } from '#lib/utils/context.js';
	import { directionsRequest } from './point.js';
	import StartPicker from './StartPicker.svelte';

	const map = getMapStore();
	const userLocation = getUserLocation();
	const request = $derived(directionsRequest(page.url.searchParams, userLocation.coords));

	afterNavigate(fitRoute);

	onMount(async () => {
		if (navigating.type) return;
		await fitRoute();
	});

	async function fitRoute() {
		if (!request) return;
		const { plan } = await getWalkingRoute(request);
		if (plan.status !== 'ok') return;
		const lons = plan.route.coordinates.map(([lon]) => lon);
		const lats = plan.route.coordinates.map(([, lat]) => lat);
		map.fitBounds([
			[Math.min(...lons), Math.min(...lats)],
			[Math.max(...lons), Math.max(...lats)]
		]);
	}

	function setFrom(value: string | null) {
		const params = new URLSearchParams(page.url.search);
		if (value) params.set('from', value);
		else params.delete('from');
		goto(`${resolve('/map/directions')}?${params}`, { replaceState: true });
	}

	function useMyLocation() {
		userLocation.requestLocation();
		setFrom(null);
	}

	const NOTES = {
		'origin-off-network':
			"The starting point is outside the mapped campus paths, so we can't plan this trip.",
		'destination-off-network':
			"That destination is outside the mapped campus paths, so we can't plan this trip.",
		'no-route': 'No campus path connects these two points. It may still be walkable.'
	};
</script>

<InfoPanel>
	<div class="flex flex-col gap-3 p-6">
		<h2 class="text-2xl font-semibold">Directions</h2>
		{#if !page.url.searchParams.get('to')}
			<p class="text-sm">Open a place and choose Directions to plan a walk there.</p>
		{:else}
			<p class="text-sm text-neutral-700">
				To <span class="font-semibold"
					>{page.url.searchParams.get('name') || 'your destination'}</span
				>
			</p>
			<StartPicker onpick={setFrom} />
			<button
				type="button"
				class="cursor-pointer self-start text-sm text-blue-700 underline"
				onclick={useMyLocation}
			>
				Use my location
			</button>
			{#if !request}
				<p class="text-sm">Choose a starting point or share your location.</p>
			{:else}
				<svelte:boundary>
					{#snippet failed()}
						<p class="text-sm">Couldn't plan this route.</p>
					{/snippet}
					{#snippet pending()}
						<p class="text-sm">Planning...</p>
					{/snippet}
					{@const { from, to, plan } = await getWalkingRoute(request)}
					{#if plan.status === 'ok'}
						<p class="text-lg font-semibold">
							{Math.max(1, Math.round(plan.route.seconds / 60))} min walk
							<span class="text-sm font-normal text-neutral-700">
								{Math.round(plan.route.meters)} m
							</span>
						</p>
						<p class="text-sm text-neutral-700">{from.name} to {to.name}</p>
						<button
							type="button"
							class="cursor-pointer self-start text-sm text-blue-700 underline"
							onclick={fitRoute}
						>
							Show route on map
						</button>
					{:else}
						<p class="text-sm">{NOTES[plan.status]}</p>
					{/if}
				</svelte:boundary>
			{/if}
		{/if}
	</div>
</InfoPanel>
