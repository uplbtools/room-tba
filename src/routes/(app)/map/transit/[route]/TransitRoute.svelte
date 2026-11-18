<script lang="ts">
	import {
		ROUTE_BOARDING_NOTES,
		ROUTE_END_BOARDS,
		ROUTE_LINE_CODES,
		ROUTE_SIGNBOARDS,
		routeSchedule,
		type JeepneyRoute,
		type ResolvedRouteGeometry
	} from '#lib/constants/map/jeepney-routes.js';
	import { darkenForWhiteText } from '#lib/utils/color-contrast.js';
	import {
		distinctStopCount,
		isLoopRoute,
		routeFareInfo,
		transitRouteKind,
		transitRouteNoun
	} from '#lib/utils/transit/transit-route-kind.js';
	import { routeScheduleSummary } from '#lib/utils/transit/transit-schedule.js';
	import TransitSignboard from '../TransitSignboard.svelte';

	const { route }: { route: JeepneyRoute & { geometry: ResolvedRouteGeometry } } = $props();

	const fare = $derived(routeFareInfo(route));
	const schedule = $derived(routeScheduleSummary(route.id));
	const loop = $derived(isLoopRoute(route));
	const boardingNote = $derived(ROUTE_BOARDING_NOTES[route.id]);
	const signboard = $derived(ROUTE_SIGNBOARDS[route.id]);
	const codes = $derived(ROUTE_LINE_CODES[route.id] ?? []);
	const timetable = $derived(routeSchedule(route.id));
	const endBoards = $derived(ROUTE_END_BOARDS[route.id] ?? []);
</script>

<div class="flex flex-col gap-3 p-6">
	<header>
		<h2 class="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-base font-bold">
			<TransitSignboard
				lines={signboard ?? [route.name]}
				kind={transitRouteKind(route)}
				lineColor={route.color}
			/>
			{#each codes as code (code)}
				<span
					class="rounded px-1.5 py-0.5 text-xs font-extrabold tracking-wide text-white"
					style:background-color={darkenForWhiteText(route.color)}>{code}</span
				>
			{/each}
			<span class="text-sm font-semibold text-neutral-600"
				>{signboard ? route.name : transitRouteNoun(route)}</span
			>
		</h2>
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
				{#if fare.ticketing.price}
					<strong>₱{fare.ticketing.price}</strong> a seat. Book on the
				{:else}
					Buy tickets on the
				{/if}
				<a class="underline" href={fare.ticketing.url} target="_blank" rel="noopener noreferrer"
					>{fare.ticketing.operator} website</a
				>{fare.ticketing.price
					? `. Price checked ${fare.ticketing.priceCheckedOn}.`
					: ', which also lists the current fare.'}
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
				{#if timetable?.departures?.length}
					<span class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
						{timetable.days}, leaves at
						{#each timetable.departures as time (time)}
							<span class="rounded bg-neutral-900 px-1.5 py-px text-xs font-bold text-white"
								>{time}</span
							>
						{/each}
						{#if schedule.note}<span>{schedule.note}</span>{/if}
					</span>
				{:else}
					{schedule.hours}{schedule.published ? `, ${schedule.frequency}` : ''}{schedule.note
						? `. ${schedule.note}`
						: ''}
				{/if}
			</li>
		{/if}
	</ul>

	{#if route.geometry.caveat}
		<p class="text-xs text-neutral-600">{route.geometry.caveat}</p>
	{/if}

	{#if endBoards.length > 0}
		<h3 class="font-semibold">Where it ends</h3>
		<ul class="flex flex-col gap-1.5 text-sm text-neutral-800">
			{#each endBoards as end (end.board)}
				<li class="flex items-center gap-2">
					<span class="min-w-22"><TransitSignboard lines={[end.board]} small /></span>
					<span>{end.ends}</span>
				</li>
			{/each}
		</ul>
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
				<a
					class="underline-offset-2 hover:underline"
					href={`/map/transit/${encodeURIComponent(route.id)}/${i + 1}`}
					>{stop.name}{loop && i === route.stops.length - 1 ? ' (back to the start)' : ''}</a
				>
			</li>
		{/each}
	</ol>

	<a class="text-sm underline" href="/api/transit-map" target="_blank" rel="noopener"
		>Printable transit map</a
	>
</div>
