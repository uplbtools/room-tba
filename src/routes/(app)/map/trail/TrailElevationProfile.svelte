<script lang="ts">
	import type { MeasuredTrailStop, ProfilePoint } from '#lib/utils/makiling-trail.js';
	import { formatKm, formatMeters } from '#lib/utils/makiling-trail.js';

	const {
		profile,
		stops,
		selectedStopId,
		startLabel
	}: {
		profile: readonly ProfilePoint[];
		stops: readonly MeasuredTrailStop[];
		selectedStopId: string | null;
		startLabel: string;
	} = $props();

	const W = 320;
	const H = 140;
	const M = { top: 10, right: 10, bottom: 28, left: 40 };
	const plotW = W - M.left - M.right;
	const plotH = H - M.top - M.bottom;

	const maxDistance = $derived(profile.at(-1)?.distance ?? 1);
	const minEle = $derived(Math.floor(Math.min(...profile.map((p) => p.elevation)) / 100) * 100);
	const maxEle = $derived(Math.ceil(Math.max(...profile.map((p) => p.elevation)) / 100) * 100);

	const x = (distance: number) => M.left + (distance / maxDistance) * plotW;
	const y = (elevation: number) =>
		M.top + plotH - ((elevation - minEle) / Math.max(1, maxEle - minEle)) * plotH;

	const linePath = $derived(
		profile
			.map(
				(p, i) => `${i === 0 ? 'M' : 'L'}${x(p.distance).toFixed(1)},${y(p.elevation).toFixed(1)}`
			)
			.join('')
	);
	const areaPath = $derived(
		`${linePath}L${x(maxDistance).toFixed(1)},${M.top + plotH}L${M.left},${M.top + plotH}Z`
	);
	const yTicks = $derived.by(() => {
		const step = maxEle - minEle > 600 ? 500 : 200;
		const ticks: number[] = [];
		for (let v = Math.ceil(minEle / step) * step; v <= maxEle; v += step) ticks.push(v);
		return ticks;
	});
	const xTicks = $derived(
		Array.from({ length: Math.floor(maxDistance / 2000) + 1 }, (_, i) => i * 2)
	);
	const markedStops = $derived(stops.filter((s) => s.description !== undefined));

	const summary = $derived(
		`Elevation profile from ${startLabel} at ${formatMeters(profile[0]?.elevation ?? 0)} to Peak 2 at ${formatMeters(profile.at(-1)?.elevation ?? 0)} over ${formatKm(maxDistance)}. ` +
			markedStops
				.map((s) => `${s.name}: ${formatKm(s.distanceMeters)}, ${formatMeters(s.elevationMeters)}`)
				.join('. ')
	);
</script>

<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} class="w-full">
	{#each yTicks as tick (tick)}
		<line class="stroke-neutral-200" x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} />
		<text
			class="fill-neutral-600 text-[9px]"
			x={M.left - 6}
			y={y(tick)}
			text-anchor="end"
			dominant-baseline="middle">{tick}</text
		>
	{/each}
	{#each xTicks as km (km)}
		<text
			class="fill-neutral-600 text-[9px]"
			x={x(km * 1000)}
			y={M.top + plotH + 14}
			text-anchor="middle">{km}</text
		>
	{/each}
	<text class="fill-neutral-600 text-[9px]" x={M.left + plotW / 2} y={H - 2} text-anchor="middle"
		>Distance from {startLabel} (km)</text
	>
	<text
		class="fill-neutral-600 text-[9px]"
		transform={`translate(10 ${M.top + plotH / 2}) rotate(-90)`}
		text-anchor="middle">Elevation (m)</text
	>
	<path class="fill-green-700/15" d={areaPath} />
	<path class="fill-none stroke-green-700 stroke-2" d={linePath} />
	{#each markedStops as stop (stop.id)}
		<circle
			class={stop.id === selectedStopId ? 'fill-green-700' : 'fill-white stroke-green-700'}
			cx={x(stop.distanceMeters)}
			cy={y(stop.elevationMeters)}
			r={stop.id === selectedStopId ? 5 : 4}
		>
			<title>{stop.name}, {formatMeters(stop.elevationMeters)}</title>
		</circle>
	{/each}
</svg>
