<script lang="ts">
	import { onMount } from 'svelte';
	import { getStopPeaks, getStopReports, reportJeep } from '#lib/functions/transit.remote.js';
	import { getUserLocation } from '#lib/utils/context.js';
	import {
		CROWDING_ESTIMATE_NOTE,
		CROWDING_REPORTS_NOTE,
		crowdingHint
	} from '#lib/utils/transit/transit-crowding.js';
	import { type RouteAtStop, routeDirections } from '#lib/utils/transit/transit-direction.js';
	import {
		type JeepReport,
		type ReportDirection,
		REPORT_COOLDOWN_MS,
		frequencyText,
		lastReportText,
		recentFullReports,
		reportTimesFor,
		summarizeReports,
		transitStopKey
	} from '#lib/utils/transit/transit-reports.js';

	const { entries }: { entries: RouteAtStop[] } = $props();

	const userLocation = getUserLocation();
	const DEVICE_KEY = 'room-tba:transit-device-id';

	type Row = {
		key: string;
		routeId: string;
		name: string;
		color: string;
		stopKey: string;
		direction: ReportDirection | null;
		directionLabel: string | null;
	};

	// A two-way route gets a row per direction, since those are different jeeps.
	const rows = $derived(
		entries.flatMap((entry): Row[] => {
			const stop = entry.route.stops[entry.stopIndex];
			if (!stop) return [];
			const base = {
				routeId: entry.route.id,
				name: entry.route.name,
				color: entry.route.color,
				stopKey: transitStopKey(stop)
			};
			const directions = routeDirections(entry.route.id);
			if (!directions)
				return [{ ...base, key: base.routeId, direction: null, directionLabel: null }];
			return (['forward', 'reverse'] as const).map((direction) => ({
				...base,
				key: `${base.routeId}:${direction}`,
				direction,
				directionLabel: directions[direction].label
			}));
		})
	);
	const stopKeys = $derived([...new Set(rows.map((row) => row.stopKey))]);

	let now = $state(Date.now());
	let sent = $state<Record<string, { at: number; full: boolean }>>({});
	let pending = $state<string | null>(null);
	let message = $state<{ key: string; text: string; error: boolean } | null>(null);

	onMount(() => {
		const tick = setInterval(() => (now = Date.now()), 30_000);
		const poll = setInterval(() => void getStopReports(stopKeys).refresh(), 60_000);
		return () => {
			clearInterval(tick);
			clearInterval(poll);
		};
	});

	function deviceId(): string {
		try {
			const stored = localStorage.getItem(DEVICE_KEY);
			if (stored) return stored;
			const id = crypto.randomUUID();
			localStorage.setItem(DEVICE_KEY, id);
			return id;
		} catch {
			return crypto.randomUUID();
		}
	}

	function statusFor(row: Row, reports: JeepReport[], clock: number) {
		const summary = summarizeReports(
			reportTimesFor(reports, row.routeId, row.stopKey, row.direction),
			clock
		);
		return { last: lastReportText(summary, clock), frequency: frequencyText(summary) };
	}

	function coolingDown(row: Row, full: boolean) {
		const tap = sent[row.key];
		if (!tap || now - tap.at >= REPORT_COOLDOWN_MS) return false;
		return full ? tap.full : true;
	}

	async function report(row: Row, full: boolean) {
		pending = `${row.key}:${full}`;
		message = null;
		const coords = userLocation.coords;
		const result = await reportJeep({
			routeId: row.routeId,
			stopKey: row.stopKey,
			direction: row.direction,
			full,
			deviceId: deviceId(),
			...(coords ? { lon: coords[0], lat: coords[1] } : {})
		}).catch(() => ({ ok: false, error: 'You seem to be offline. Try again.' }));
		pending = null;
		if (!result.ok) {
			message = { key: row.key, text: result.error ?? "Couldn't send the report.", error: true };
			return;
		}
		const previous = sent[row.key];
		const fresh = !previous || Date.now() - previous.at >= REPORT_COOLDOWN_MS;
		now = Date.now();
		sent[row.key] = { at: fresh ? now : previous.at, full: full || (!fresh && previous.full) };
		message = {
			key: row.key,
			text: full ? 'Thanks, marked as full.' : 'Thanks, we got your report.',
			error: false
		};
		void getStopReports(stopKeys).refresh();
	}
</script>

{#if rows.length > 0}
	<section class="flex flex-col gap-2" aria-label="Jeep reports">
		<h3 class="font-semibold">Jeep reports</h3>
		<svelte:boundary>
			{#snippet failed()}{/snippet}
			{@const data = await getStopReports(stopKeys)}
			{@const peaks = await getStopPeaks(stopKeys[0]!)}
			{@const hint = crowdingHint({
				now: data.now,
				peaks: peaks.peaks,
				termWindow: peaks.termWindow,
				fullReports: recentFullReports(data.reports, data.now)
			})}
			{#if hint}
				<p
					class="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-sm text-amber-900"
				>
					{hint.text}
					<span class="block text-xs"
						>{hint.source === 'reports' ? CROWDING_REPORTS_NOTE : CROWDING_ESTIMATE_NOTE}</span
					>
				</p>
			{/if}
		</svelte:boundary>

		<ul class="flex flex-col gap-3">
			{#each rows as row (row.key)}
				{@const label = row.directionLabel ? `${row.name} (${row.directionLabel})` : row.name}
				<li class="flex flex-col gap-1">
					<p class="flex items-center gap-2 text-sm font-medium">
						<span class="size-2.5 shrink-0 rounded-full" style:background-color={row.color}></span>
						{row.name}
						{#if row.directionLabel}
							<span class="font-normal text-neutral-600">{row.directionLabel}</span>
						{/if}
					</p>
					<svelte:boundary>
						{#snippet failed()}{/snippet}
						{@const data = await getStopReports(stopKeys)}
						{@const status = statusFor(row, data.reports, data.now)}
						<p class="text-sm text-neutral-700">
							{status.last}{status.frequency ? `. ${status.frequency}` : ''}
						</p>
					</svelte:boundary>
					<div class="flex gap-2">
						<button
							type="button"
							class="rounded-full bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
							aria-label={`Jeep is here: ${label}`}
							disabled={pending !== null || coolingDown(row, false)}
							onclick={() => report(row, false)}
						>
							{coolingDown(row, false) ? 'Reported' : 'Jeep is here'}
						</button>
						<button
							type="button"
							class="rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
							aria-label={`It was full: ${label}`}
							disabled={pending !== null || coolingDown(row, true)}
							onclick={() => report(row, true)}
						>
							{coolingDown(row, true) ? 'Marked full' : 'It was full'}
						</button>
					</div>
					{#if message?.key === row.key}
						<p
							class={['text-sm', message.error ? 'text-red-700' : 'text-neutral-700']}
							role={message.error ? 'alert' : 'status'}
						>
							{message.text}
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}
