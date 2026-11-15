<script lang="ts">
	import type { JeepneyRoute } from '#lib/constants/map/jeepney-routes.js';
	import type { RouteAtStop } from '#lib/utils/transit/transit-direction.js';
	import { transitRouteNoun } from '#lib/utils/transit/transit-route-kind.js';
	import JeepStopReports from './JeepStopReports.svelte';

	const { route, index, entries }: { route: JeepneyRoute; index: number; entries: RouteAtStop[] } =
		$props();

	const stop = $derived(route.stops[index]!);
	const routePath = $derived(`/map/transit/${encodeURIComponent(route.id)}`);
	// The open route first, so its buttons are the ones under the thumb.
	const ordered = $derived([
		...entries.filter((entry) => entry.route.id === route.id),
		...entries.filter((entry) => entry.route.id !== route.id)
	]);
</script>

<div class="flex flex-col gap-3 p-6">
	<header class="flex flex-col">
		<h2 class="text-2xl font-semibold">{stop.name}</h2>
		<a class="text-sm text-neutral-700 underline-offset-2 hover:underline" href={routePath}
			>Stop {index + 1} of {route.stops.length}, {route.name} {transitRouteNoun(route)}</a
		>
	</header>
	{#if stop.description}
		<p class="text-sm text-neutral-800">{stop.description}</p>
	{/if}

	<nav class="flex justify-between text-sm" aria-label="Stops on this route">
		{#if index > 0}
			<a class="underline" href={`${routePath}/${index}`}>Previous stop</a>
		{:else}
			<span></span>
		{/if}
		{#if index < route.stops.length - 1}
			<a class="underline" href={`${routePath}/${index + 2}`}>Next stop</a>
		{/if}
	</nav>

	{#if ordered.length > 1}
		<section aria-label="Routes at this stop">
			<h3 class="font-semibold">Routes at this stop</h3>
			<ul class="flex flex-col gap-1 text-sm">
				{#each ordered as entry (entry.route.id)}
					<li class="flex items-center gap-2">
						<span class="size-2.5 shrink-0 rounded-full" style:background-color={entry.route.color}
						></span>
						<a
							class="underline-offset-2 hover:underline"
							href={`/map/transit/${encodeURIComponent(entry.route.id)}/${entry.stopIndex + 1}`}
							>{entry.route.name}</a
						>
						<span class="text-neutral-600">{entry.direction}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<JeepStopReports entries={ordered} />
</div>
