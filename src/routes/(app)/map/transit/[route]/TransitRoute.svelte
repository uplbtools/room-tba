<script lang="ts">
	import {
		ROUTE_BOARDING_NOTES,
		type JeepneyRoute,
		type ResolvedRouteGeometry
	} from '#lib/constants/map/jeepney-routes.js';
	import {
		distinctStopCount,
		isLoopRoute,
		routeFareInfo,
		transitRouteNoun
	} from '#lib/utils/transit/transit-route-kind.js';
	import { routeScheduleSummary } from '#lib/utils/transit/transit-schedule.js';

	const { route }: { route: JeepneyRoute & { geometry: ResolvedRouteGeometry } } = $props();

	const fare = $derived(routeFareInfo(route));
	const schedule = $derived(routeScheduleSummary(route.id));
	const loop = $derived(isLoopRoute(route));
	const boardingNote = $derived(ROUTE_BOARDING_NOTES[route.id]);
</script>

<div class="flex flex-col gap-3 p-6">
	<header class="flex items-center gap-2">
		<span class="size-3 shrink-0 rounded-full" style:background-color={route.color}></span>
		<h2 class="text-2xl font-semibold">{route.name} {transitRouteNoun(route)}</h2>
	</header>
	{#if route.description}
		<p class="text-sm text-neutral-800">{route.description}</p>
	{/if}
	{#if route.directionNote}
		<p class="text-sm text-neutral-800">{route.directionNote}</p>
	{/if}
	{#if boardingNote}
		<p class="text-sm text-neutral-800">{boardingNote}</p>
	{/if}

	<ul class="flex flex-col gap-1 text-sm text-neutral-800">
		<li>
			{#if fare.kind === 'ticketed'}
				Buy tickets on the <a
					class="underline"
					href={fare.ticketing.url}
					target="_blank"
					rel="noopener noreferrer">{fare.ticketing.operator} website</a
				>, which also lists the current fare.
			{:else if fare.kind === 'fixed' || fare.kind === 'end-to-end'}
				{fare.kind === 'end-to-end' ? 'Whole route ' : ''}<strong>₱{fare.fare.regular}</strong>
				regular, <strong>₱{fare.fare.discounted}</strong> student / PWD / senior
			{:else if fare.kind === 'distance'}
				Minimum fare <strong>₱{fare.minimum.regular}</strong> regular,
				<strong>₱{fare.minimum.discounted}</strong> student / PWD / senior
			{:else}
				{fare.note}
			{/if}
		</li>
		{#if schedule}
			<li>
				{schedule.hours}{schedule.published ? `, ${schedule.frequency}` : ''}{schedule.note
					? `. ${schedule.note}`
					: ''}
			</li>
		{/if}
	</ul>

	{#if route.geometry.caveat}
		<p class="text-xs text-neutral-600">{route.geometry.caveat}</p>
	{/if}

	<h3 class="font-semibold">
		Stops <span class="font-normal text-neutral-600"
			>({distinctStopCount(route)}{loop ? ', loop' : ''})</span
		>
	</h3>
	<ol class="flex flex-col gap-1 text-sm">
		{#each route.stops as stop, i (`${route.id}-${i}`)}
			<li class="flex gap-2">
				<span class="w-5 shrink-0 text-right text-neutral-600"
					>{loop && i === route.stops.length - 1 ? 1 : i + 1}</span
				>
				<span>{stop.name}{loop && i === route.stops.length - 1 ? ' (back to the start)' : ''}</span>
			</li>
		{/each}
	</ol>
</div>
