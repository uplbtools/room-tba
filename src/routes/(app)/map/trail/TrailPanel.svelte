<script lang="ts">
	import { MAKILING_TRAILS } from '#lib/constants/map/makiling-trail.js';
	import {
		findTrailStop,
		formatHours,
		formatKm,
		formatMeters,
		getTrail,
		getTrailStops,
		getTrailSummary,
		stationLabel
	} from '#lib/utils/makiling-trail.js';
	import TrailElevationProfile from './TrailElevationProfile.svelte';

	const { trailId, stopId }: { trailId: string; stopId: string | null } = $props();

	const trail = $derived(getTrail(trailId));
	const summary = $derived(getTrailSummary(trail.id));
	const stops = $derived(getTrailStops(trail.id));
	const stop = $derived(findTrailStop(stopId));
	const stopIndex = $derived(stop ? stops.findIndex((s) => s.id === stop.id) : -1);
	const prevStop = $derived(stopIndex > 0 ? stops[stopIndex - 1] : null);
	const nextStop = $derived(stopIndex >= 0 ? (stops[stopIndex + 1] ?? null) : null);

	const trailHref = (id: string) =>
		id === MAKILING_TRAILS[0]?.id ? '/map/trail' : `/map/trail?trail=${id}`;
	const stopHref = (id: string) => `/map/trail?trail=${id}`;
</script>

{#snippet fact(label: string, value: string)}
	<div>
		<dt class="text-xs text-neutral-600">{label}</dt>
		<dd class="font-semibold">{value}</dd>
	</div>
{/snippet}

<div class="flex flex-col gap-3 p-6 text-sm text-neutral-800">
	{#if stop}
		<a class="text-xs underline" href={trailHref(trail.id)}>{trail.name}</a>
		<h2 class="text-2xl font-semibold">{stop.name}</h2>
		{#if stationLabel(stop) && !stop.name.includes(stationLabel(stop) ?? '')}
			<p class="text-neutral-600">{stationLabel(stop)}</p>
		{/if}
		<dl class="grid grid-cols-3 gap-2">
			{@render fact('Elevation', formatMeters(stop.elevationMeters))}
			{@render fact(`From ${trail.startLabel}`, formatKm(stop.distanceMeters))}
			{@render fact('To Peak 2', formatKm(summary.lengthMeters - stop.distanceMeters))}
		</dl>
		{#if stop.description}
			<p>{stop.description}</p>
		{/if}
		<nav class="flex justify-between gap-2" aria-label="Stops along the trail">
			{#if prevStop}
				<a class="underline" href={stopHref(prevStop.id)}>Previous, {prevStop.name}</a>
			{:else}
				<span></span>
			{/if}
			{#if nextStop}
				<a class="text-right underline" href={stopHref(nextStop.id)}>Next, {nextStop.name}</a>
			{/if}
		</nav>
	{:else}
		<h2 class="text-2xl font-semibold">{trail.name}</h2>
		<p class="text-neutral-600">{trail.subtitle}</p>
		<div class="flex gap-2" role="group" aria-label="Trail">
			{#each MAKILING_TRAILS as item (item.id)}
				<a
					class="rounded-full border px-3 py-1.5 font-semibold {item.id === trail.id
						? 'border-green-700 bg-green-700 text-white'
						: 'border-neutral-300'}"
					href={trailHref(item.id)}
					aria-current={item.id === trail.id ? 'true' : undefined}>{item.label}</a
				>
			{/each}
		</div>
		{#if trail.closed}
			<p class="rounded border border-amber-300 bg-amber-50 p-2">
				{trail.closed.text} Check
				<a class="underline" href={trail.closed.href} target="_blank" rel="noreferrer"
					>{trail.closed.label}</a
				>
				for the opening announcement.
			</p>
		{/if}
		<dl class="grid grid-cols-2 gap-2">
			{@render fact('Length', formatKm(summary.hikeMeters))}
			{@render fact('Elevation gain', formatMeters(summary.gainMeters))}
			{@render fact('Route type', trail.oneWay ? 'One way' : 'Out and back')}
			{@render fact('Est. time', trail.estTime ?? formatHours(summary.naismithHours))}
			{#if !trail.oneWay}
				{@render fact('Difficulty', summary.difficulty)}
			{/if}
		</dl>
		<p class="text-neutral-600">
			{#if trail.oneWay}
				The trail is {formatKm(summary.lengthMeters)} from {formatMeters(summary.startElevation)} at the
				trailhead to {formatMeters(summary.summitElevation)} at Peak 2. The time is from older guides
				(Pinoy Mountaineer, 2015).
			{:else}
				The trail is {formatKm(summary.lengthMeters)} each way, from {formatMeters(
					summary.startElevation
				)} at Station 1 to {formatMeters(summary.summitElevation)} at Peak 2. Time uses Naismith's rule
				(5 km per hour plus 1 hour per 600 m climbed). Mud and rest stops often add hours.
			{/if}
		</p>

		<h3 class="font-semibold">Elevation profile</h3>
		<TrailElevationProfile
			profile={summary.profile}
			{stops}
			selectedStopId={null}
			startLabel={trail.startLabel}
		/>

		<h3 class="font-semibold">Before you go</h3>
		<ul class="flex flex-col gap-1.5">
			{#each trail.beforeYouGo as item (item.title)}
				<li><strong>{item.title}.</strong> {item.body}</li>
			{/each}
		</ul>
		<p class="text-xs text-neutral-600">
			{trail.source.text}
			<a class="underline" href={trail.source.href} target="_blank" rel="noreferrer"
				>{trail.source.label}</a
			>. Confirm with MCME before your hike. This map is for planning, not navigation.
		</p>

		<h3 class="font-semibold">
			{stops.some((item) => item.station !== null) ? 'Stations' : 'Stops'}
		</h3>
		<ol class="flex flex-col gap-1">
			{#each stops as item (item.id)}
				<li>
					<a class="underline-offset-2 hover:underline" href={stopHref(item.id)}>{item.name}</a>
					<span class="text-xs text-neutral-600"
						>{formatKm(item.distanceMeters)} from {trail.startLabel}, {formatMeters(
							item.elevationMeters
						)}</span
					>
				</li>
			{/each}
		</ol>
	{/if}
</div>
