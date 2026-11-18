<script lang="ts">
	import { getRoomWalkMinutes } from '#lib/functions/walk.remote.js';
	import type { ClassOfferingGroup } from '#lib/utils/class-offering-groups.js';
	import { formatScheduleShort } from '#lib/utils/planner/format.js';
	import { findSchedules, MAX_RESULTS, type FindResult } from '#lib/utils/planner/find-schedule.js';
	import type { ClassMapValue } from '#lib/utils/types.js';

	let {
		rows,
		courseCodes,
		onpick
	}: {
		rows: ClassMapValue[];
		courseCodes: string[];
		onpick: (offerings: ClassOfferingGroup[]) => void;
	} = $props();

	const SHOWN = 10;
	const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	let notBefore = $state('');
	let freeDay = $state('');
	let lunch = $state(false);
	let lunchStart = $state('11:30');
	let lunchEnd = $state('13:00');
	let walk = $state(false);
	let finding = $state(false);
	let result = $state<FindResult | null>(null);

	function minutes(time: string): number | null {
		const [h, m] = time.split(':').map(Number);
		return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
	}

	async function find() {
		finding = true;
		try {
			const start = minutes(lunchStart);
			const end = minutes(lunchEnd);
			const walkTimes = walk
				? await getRoomWalkMinutes([
						...new Set(rows.flatMap((r) => (r.roomCode ? [r.roomCode] : [])))
					])
				: null;
			result = findSchedules(rows, courseCodes, {
				notBefore: minutes(notBefore),
				freeDay: freeDay === 'any' ? 'any' : freeDay === '' ? null : +freeDay,
				lunch: lunch && start !== null && end !== null ? { startMin: start, endMin: end } : null,
				walkMinutes: walkTimes && ((from, to) => walkTimes[`${from}|${to}`] ?? 0)
			});
		} finally {
			finding = false;
		}
	}

	function times(group: ClassOfferingGroup) {
		return [...new Set(group.sections.flatMap((r) => r.schedule ?? []))]
			.map(formatScheduleShort)
			.join(', ');
	}

	function summary(s: { violations: number; gapMinutes: number }) {
		const gap = s.gapMinutes ? `${(s.gapMinutes / 60).toFixed(1)} h of gaps` : 'no gaps';
		return s.violations
			? `Misses ${s.violations} of your filters, ${gap}`
			: `Meets your filters, ${gap}`;
	}
</script>

<details class="find">
	<summary class="find__summary">Find me a schedule</summary>
	<p class="find__hint">
		Tries every section combination for these {courseCodes.length} courses with no overlap.
	</p>
	<div class="find__fields">
		<label>
			No class before
			<input type="time" bind:value={notBefore} />
		</label>
		<label>
			Free weekday
			<select bind:value={freeDay}>
				<option value="">None</option>
				<option value="any">Any</option>
				{#each DAYS as day, i (day)}
					<option value={i}>{day}</option>
				{/each}
			</select>
		</label>
	</div>
	<div class="find__row">
		<label class="find__check">
			<input type="checkbox" bind:checked={lunch} />
			Keep lunch free
		</label>
		{#if lunch}
			<input type="time" bind:value={lunchStart} aria-label="Lunch starts" />
			<span aria-hidden="true">to</span>
			<input type="time" bind:value={lunchEnd} aria-label="Lunch ends" />
		{/if}
	</div>
	<label class="find__check">
		<input type="checkbox" bind:checked={walk} />
		Leave time to walk between buildings
	</label>
	<button type="button" class="find__go" onclick={find} disabled={finding || rows.length === 0}>
		{finding ? 'Finding…' : 'Find schedules'}
	</button>

	{#if result}
		{#if result.missing.length > 0}
			<p class="find__hint" role="note">
				No sections found for {result.missing.join(', ')}, so they're left out.
			</p>
		{/if}
		{#if result.schedules.length === 0}
			<p class="find__hint" role="status">Every combination has a time overlap.</p>
		{:else}
			<p class="find__hint" role="status">
				{result.capped
					? `Stopped at the first ${MAX_RESULTS} schedules, so there may be more. Add filters to narrow it.`
					: `${result.schedules.length} schedule${result.schedules.length === 1 ? '' : 's'} found.`}
				Showing the best {Math.min(SHOWN, result.schedules.length)}.
			</p>
			<ol class="find__list">
				{#each result.schedules.slice(0, SHOWN) as schedule, i (i)}
					<li class="find__item">
						<ul class="find__parts">
							{#each schedule.offerings as group (group.key)}
								<li>
									<strong>{group.courseCode} {group.section}</strong>
									{times(group)}
								</li>
							{/each}
						</ul>
						<p class="find__meta">{summary(schedule)}</p>
						<button type="button" class="find__use" onclick={() => onpick(schedule.offerings)}>
							Use this schedule
						</button>
					</li>
				{/each}
			</ol>
		{/if}
	{/if}
</details>

<style>
	.find {
		margin: 0 0 0.75rem;
		padding: 0.5rem 0.625rem;
		border: 1px solid var(--theme-border, hsl(0, 0%, 85%));
		border-radius: 0.5rem;
		font-size: 0.75rem;
		min-width: 0;
	}

	.find__summary {
		cursor: pointer;
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--theme-accent-text, hsl(5, 53%, 30%));
	}

	.find__hint,
	.find__meta {
		margin: 0.375rem 0;
		line-height: 1.45;
		color: var(--theme-text-2, hsl(0, 0%, 38%));
	}

	.find__fields,
	.find__row {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.find label {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.find__fields label {
		flex: 1 1 7rem;
	}

	.find input[type='time'],
	.find select {
		min-width: 0;
		min-height: 2rem;
		box-sizing: border-box;
		font: inherit;
	}

	.find .find__check {
		flex-direction: row;
		align-items: center;
		gap: 0.375rem;
		min-height: 2rem;
	}

	.find__go,
	.find__use {
		min-height: 2rem;
		padding: 0.375rem 0.75rem;
		border: 1px solid hsl(5, 53%, 62%);
		border-radius: 999px;
		background: var(--theme-accent-soft, hsl(5, 53%, 97%));
		color: var(--theme-accent-text, hsl(5, 53%, 30%));
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.find__go:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.find__list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.find__item {
		padding: 0.5rem;
		border-radius: 0.5rem;
		background: var(--theme-surface, hsl(0, 0%, 97%));
		overflow-wrap: anywhere;
	}

	.find__parts {
		margin: 0;
		padding: 0;
		list-style: none;
		line-height: 1.5;
	}

	.find__meta {
		margin: 0.25rem 0 0.375rem;
	}
</style>
