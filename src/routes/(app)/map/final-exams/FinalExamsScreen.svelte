<script lang="ts">
	import CalendarX from '@lucide/svelte/icons/calendar-x';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Search from '@lucide/svelte/icons/search';
	import { fly } from 'svelte/transition';
	import { MediaQuery } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { getFinalExams } from '#lib/functions/final-exams.remote.js';
	import FinalExamsList from '#lib/components/room/FinalExamsList.svelte';
	import TermSelector from '#lib/components/TermSelector.svelte';
	import { getTermStore } from '#lib/utils/context.js';
	import { FINALS_SCOPE_NOTE, formatExamDate } from '#lib/utils/final-exams/final-exams.js';
	import { trapFocus } from '#lib/utils/focus-trap.js';
	import { fullScreenReveal } from '#lib/utils/motion.js';
	import { finalsWindowLabel } from '#lib/utils/term/term-calendar.js';
	import type { FinalExamRow } from '#lib/utils/types.js';

	const termStore = getTermStore();
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

	let screenEl = $state<HTMLDivElement | null>(null);
	let filter = $state('');

	function close() {
		goto('/map');
	}

	$effect(() => {
		if (!screenEl) return;
		return trapFocus(screenEl, { onEscape: close });
	});

	const exams = $derived(
		termStore.activeTermId == null
			? Promise.resolve([])
			: getFinalExams({ termId: termStore.activeTermId })
	);

	const finalsWindow = $derived(finalsWindowLabel(termStore.activeTermId));

	function groupByDate(rows: FinalExamRow[], needle: string) {
		const groups = new Map<string, FinalExamRow[]>();
		for (const exam of rows) {
			const match =
				!needle ||
				[exam.courseCode, exam.courseTitle, exam.section, exam.roomCode].some((part) =>
					part?.toUpperCase().includes(needle)
				);
			if (!match) continue;
			const group = groups.get(exam.examDate);
			if (group) group.push(exam);
			else groups.set(exam.examDate, [exam]);
		}
		return [...groups.entries()];
	}
</script>

<div
	bind:this={screenEl}
	class="finals-screen"
	role="dialog"
	aria-modal="true"
	aria-labelledby="finals-screen-title"
	in:fly={fullScreenReveal(reducedMotion.current)}
>
	<header class="finals-header">
		<button
			type="button"
			class="finals-back"
			onclick={close}
			aria-label="Back to map"
			title="Back to map"
		>
			<ChevronLeft size={22} aria-hidden="true" />
		</button>
		<h1 class="finals-title" id="finals-screen-title">Final exams</h1>
	</header>

	<div class="finals-toolbar">
		{#if termStore.terms.length > 0}
			<TermSelector variant="chip" />
		{/if}
		<details class="finals-about">
			<summary>About these times</summary>
			<p role="note">{FINALS_SCOPE_NOTE}</p>
		</details>
	</div>

	<svelte:boundary>
		{#snippet pending()}
			<p class="finals-status" role="status">Loading final exams…</p>
		{/snippet}
		{#snippet failed()}
			<p class="finals-status" role="alert">Final exams could not load.</p>
		{/snippet}
		{@const rows = await exams}
		{@const byDate = groupByDate(rows, filter.trim().toUpperCase())}
		{#if rows.length > 0}
			<label class="finals-search">
				<Search size={16} aria-hidden="true" />
				<input
					type="search"
					placeholder="Filter by course, section, or room…"
					bind:value={filter}
					aria-label="Filter final exams"
				/>
			</label>
		{/if}

		<div class="finals-body">
			{#if rows.length === 0}
				<div class="finals-empty">
					<CalendarX size={32} aria-hidden="true" />
					<h2 class="finals-empty__title">No schedule published yet</h2>
					<p class="finals-status">
						The registrar hasn't released final exams for this term.{#if finalsWindow}{' '}The
							academic calendar sets them for
							<span class="finals-nowrap">{finalsWindow}</span>.{/if}
					</p>
					<a class="finals-empty__action" href="/map/calendar">See academic calendar</a>
				</div>
			{:else if byDate.length === 0}
				<p class="finals-status">No exams match “{filter}”.</p>
			{:else}
				{#each byDate as [date, dayExams] (date)}
					<section class="finals-day" aria-label={formatExamDate(date)}>
						<h2 class="finals-day__heading">
							{formatExamDate(date)}
							<span class="finals-day__count">({dayExams.length})</span>
						</h2>
						<FinalExamsList exams={dayExams} showRoom={true} />
					</section>
				{/each}
			{/if}
		</div>
	</svelte:boundary>
</div>

<style>
	.finals-screen {
		z-index: 150;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem 1.25rem calc(1rem + env(safe-area-inset-bottom, 0px));
		background: var(--theme-surface, hsl(0, 0%, 98%));
		flex: 1 1 auto;
		align-self: stretch;
		min-width: 0;
		min-height: 0;
		pointer-events: auto;
		overflow: hidden;
	}

	.finals-header {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: -0.5rem;
	}

	.finals-back {
		all: unset;
		box-sizing: border-box;
		display: inline-flex;
		flex: 0 0 auto;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 999px;
		color: var(--theme-accent-text, hsl(5, 53%, 32%));
		cursor: pointer;
	}

	.finals-back:hover {
		background: var(--theme-accent-soft, hsl(5, 30%, 94%));
	}

	.finals-back:focus-visible {
		outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
	}

	.finals-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--theme-text, hsl(0, 0%, 12%));
	}

	.finals-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
		max-width: 52rem;
	}

	.finals-about {
		font-size: 0.8125rem;
		color: var(--theme-text-2, hsl(0, 0%, 40%));
	}

	.finals-about summary {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		font-weight: 600;
		color: var(--theme-accent-text, hsl(5, 53%, 32%));
		cursor: pointer;
	}

	.finals-about summary:focus-visible {
		outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
		outline-offset: 2px;
	}

	.finals-about p {
		margin: 0 0 0.25rem;
		max-width: 52rem;
	}

	.finals-search {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		max-width: 26rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--theme-border, hsl(0, 0%, 85%));
		border-radius: 0.625rem;
		background: var(--theme-surface, white);
		color: var(--theme-text-2, hsl(0, 0%, 45%));
	}

	.finals-search:focus-within {
		border-color: var(--theme-accent-text, hsl(5, 53%, 32%));
	}

	.finals-search input {
		all: unset;
		flex: 1;
		font-size: 0.875rem;
		color: var(--theme-text, hsl(0, 0%, 12%));
	}

	.finals-body {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-bottom: 1rem;
	}

	.finals-status {
		margin: 0;
		font-size: 0.875rem;
		color: var(--theme-text-2, hsl(0, 0%, 40%));
	}

	.finals-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin: auto 0;
		padding: 2rem 1rem;
		text-align: center;
		color: var(--theme-text-2, hsl(0, 0%, 45%));
	}

	.finals-empty .finals-status {
		max-width: 24rem;
	}

	.finals-nowrap {
		white-space: nowrap;
	}

	.finals-empty__title {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: var(--theme-text, hsl(0, 0%, 15%));
	}

	.finals-empty__action {
		all: unset;
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		margin-top: 0.25rem;
		padding: 0 1.125rem;
		border-radius: 999px;
		background: var(--theme-accent-fill, hsl(5, 53%, 32%));
		color: #fff;
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
	}

	.finals-empty__action:hover {
		background: var(--theme-accent-fill, hsl(5, 53%, 38%));
	}

	.finals-empty__action:focus-visible {
		outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
		outline-offset: 2px;
	}

	.finals-day {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 52rem;
	}

	.finals-day__heading {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--theme-text, hsl(0, 0%, 20%));
		position: sticky;
		top: 0;
		background: var(--theme-surface, hsl(0, 0%, 98%));
		padding: 0.25rem 0;
	}

	.finals-day__count {
		font-weight: 500;
		color: var(--theme-text-2, hsl(0, 0%, 45%));
	}

	@media (max-width: 48rem) {
		.finals-screen {
			padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
		}
	}
</style>
