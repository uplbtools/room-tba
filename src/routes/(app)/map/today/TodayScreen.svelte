<script lang="ts">
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import { fly } from 'svelte/transition';
	import { MediaQuery } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { getPlannerStore, getSearchInfo, getTermStore } from '#lib/utils/context.js';
	import { trapFocus } from '#lib/utils/focus-trap.js';
	import { fullScreenReveal } from '#lib/utils/motion.js';
	import { buildAgenda } from '#lib/utils/planner/today-agenda.js';
	import { formatTermDateRange, isDateWithinTerm } from '#lib/utils/term/term-calendar.js';

	const plannerStore = getPlannerStore();
	const searchInfo = getSearchInfo();
	const termStore = getTermStore();
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

	let screenEl = $state<HTMLDivElement | null>(null);

	const offTermNote = $derived.by(() => {
		const term = termStore.activeTerm;
		if (!term || isDateWithinTerm(term, new Date())) return null;
		const range = formatTermDateRange(term);
		return range ? `${term.label} runs ${range}.` : null;
	});
	const sections = $derived(plannerStore.activePlan?.sections ?? []);
	const hasPlan = $derived(sections.length > 0);
	const days = $derived(buildAgenda(offTermNote ? [] : sections));

	const todayLabel = new Date().toLocaleDateString('en-PH', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		timeZone: 'Asia/Manila'
	});

	function close() {
		goto('/map');
	}

	function openRoom(roomCode: string) {
		searchInfo.updateQuery({ type: 'result', category: 'room', value: roomCode });
		close();
	}

	$effect(() => {
		if (!screenEl) return;
		return trapFocus(screenEl, { onEscape: close });
	});
</script>

<div
	bind:this={screenEl}
	class="today-screen"
	role="dialog"
	aria-modal="true"
	aria-labelledby="today-screen-title"
	in:fly={fullScreenReveal(reducedMotion.current)}
>
	<header class="today-header">
		<button
			type="button"
			class="today-back"
			onclick={close}
			aria-label="Back to map"
			title="Back to map"
		>
			<ChevronLeft size={22} aria-hidden="true" />
		</button>
		<div class="today-heading">
			<h1 class="today-title" id="today-screen-title">Today</h1>
			<p class="today-date">{todayLabel}</p>
		</div>
	</header>

	{#if offTermNote}
		<p class="today-note" role="note">{offTermNote}</p>
	{/if}

	<div class="today-body">
		{#if !hasPlan}
			<div class="today-empty-plan">
				<CalendarDays size={32} aria-hidden="true" />
				<h2 class="today-empty-plan__title">Nothing planned yet</h2>
				<p>Add classes to see your day.</p>
				<a href="/map/planner">Open the Planner</a>
			</div>
		{:else}
			{#each days as day (day.dateKey)}
				<section
					class="today-day"
					class:today-day--now={day.isToday}
					class:today-day--weekend={day.isWeekend}
					aria-label="{day.title}, {day.dateLabel}"
				>
					<h2 class="today-day__heading">
						<span class="today-day__title">{day.title}</span>
						<span class="today-day__date">{day.dateLabel}</span>
					</h2>
					{#if day.entries.length === 0}
						<p class="today-day__empty">{day.emptyLabel}</p>
					{:else}
						<ul class="today-entries">
							{#each day.entries as entry (entry.courseCode + entry.section + entry.type + entry.startMin)}
								<li class="today-entry">
									<span class="today-entry__time">{entry.timeLabel}</span>
									<span class="today-entry__main">
										<span class="today-entry__course">
											{entry.courseCode}
											<span class="today-entry__type">{entry.type}</span>
											<span class="today-entry__section">{entry.section}</span>
										</span>
										{#if entry.courseTitle}
											<span class="today-entry__course-title">{entry.courseTitle}</span>
										{/if}
									</span>
									{#if entry.roomCode}
										{@const roomCode = entry.roomCode}
										<button
											type="button"
											class="today-entry__room"
											onclick={() => openRoom(roomCode)}
											title="Open {roomCode} on the map"
										>
											<MapPin size={14} aria-hidden="true" />
											{roomCode}
										</button>
									{:else}
										<span class="today-entry__room today-entry__room--tba">Room TBA</span>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			{/each}
		{/if}
	</div>
</div>

<style>
	.today-screen {
		z-index: 150;
		display: flex;
		flex: 1 1 auto;
		align-self: stretch;
		min-width: 0;
		min-height: 0;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem 1.25rem calc(1rem + env(safe-area-inset-bottom, 0px));
		background: var(--theme-surface, hsl(0, 0%, 98%));
		pointer-events: auto;
		overflow: hidden;
	}

	.today-header {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: -0.5rem;
	}

	.today-back {
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

	.today-back:hover {
		background: var(--theme-accent-soft, hsl(5, 30%, 94%));
	}

	.today-back:focus-visible {
		outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
	}

	.today-heading {
		min-width: 0;
	}

	.today-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 800;
		line-height: 1.2;
		color: var(--theme-text, hsl(0, 0%, 12%));
	}

	.today-date {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--theme-text-2, hsl(0, 0%, 40%));
	}

	.today-note {
		margin: 0;
		max-width: 52rem;
		font-size: 0.8125rem;
		color: var(--theme-text-2, hsl(0, 0%, 40%));
	}

	.today-body {
		flex: 1;
		min-width: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-bottom: 1rem;
	}

	.today-empty-plan {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin: auto 0;
		padding: 2rem 1rem;
		text-align: center;
		color: var(--theme-text-2, hsl(0, 0%, 45%));
	}

	.today-empty-plan__title {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: var(--theme-text, hsl(0, 0%, 15%));
	}

	.today-empty-plan p {
		margin: 0;
		font-size: 0.875rem;
		color: var(--theme-text-2, hsl(0, 0%, 35%));
	}

	.today-empty-plan a {
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

	.today-empty-plan a:hover {
		background: var(--theme-accent-fill, hsl(5, 53%, 38%));
	}

	.today-empty-plan a:focus-visible {
		outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
		outline-offset: 2px;
	}

	.today-day {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		max-width: 52rem;
		min-width: 0;
	}

	.today-day__heading {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin: 0;
		padding: 0.25rem 0;
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--theme-text, hsl(0, 0%, 20%));
	}

	.today-day--now .today-day__title {
		color: var(--theme-accent-text, hsl(5, 53%, 32%));
	}

	.today-day__date {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--theme-text-2, hsl(0, 0%, 45%));
	}

	.today-day__empty {
		margin: 0;
		padding: 0.5rem 0.75rem;
		border: 1px dashed var(--theme-border, hsl(0, 0%, 82%));
		border-radius: 0.625rem;
		font-size: 0.8125rem;
		color: var(--theme-text-2, hsl(0, 0%, 45%));
	}

	.today-day--weekend .today-day__heading {
		color: var(--theme-text-2, hsl(0, 0%, 45%));
	}

	.today-day--weekend .today-day__empty {
		background: var(--theme-surface-2, hsl(0, 0%, 95%));
		border-style: solid;
		border-color: var(--theme-border, hsl(0, 0%, 88%));
	}

	.today-entries {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.today-entry {
		display: grid;
		grid-template-columns: 10rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--theme-border, hsl(0, 0%, 90%));
		border-radius: 0.625rem;
		background: var(--theme-surface, white);
	}

	.today-entry__time {
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--theme-text, hsl(0, 0%, 25%));
		font-variant-numeric: tabular-nums;
	}

	.today-entry__main {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.today-entry__course {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--theme-text, hsl(0, 0%, 15%));
	}

	.today-entry__type,
	.today-entry__section {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--theme-text-2, hsl(0, 0%, 42%));
	}

	.today-entry__course-title {
		font-size: 0.75rem;
		color: var(--theme-text-2, hsl(0, 0%, 42%));
		overflow-wrap: anywhere;
	}

	.today-entry__room {
		all: unset;
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		justify-self: end;
		min-height: 2rem;
		padding: 0.25rem 0.625rem;
		border: 1px solid var(--theme-accent-border, hsl(5, 53%, 82%));
		border-radius: 999px;
		color: var(--theme-accent-text, hsl(5, 53%, 32%));
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
	}

	.today-entry__room:hover,
	.today-entry__room:focus-visible {
		background: var(--theme-accent-soft, hsl(5, 53%, 96%));
	}

	.today-entry__room:focus-visible {
		outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
		outline-offset: 1px;
	}

	.today-entry__room--tba {
		border-color: var(--theme-border, hsl(0, 0%, 85%));
		color: var(--theme-text-2, hsl(0, 0%, 45%));
		cursor: default;
	}

	.today-entry__room--tba:hover {
		background: transparent;
	}

	@media (max-width: 48rem) {
		.today-screen {
			padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
		}

		.today-entry {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.today-entry__time {
			grid-column: 1 / -1;
		}
	}
</style>
