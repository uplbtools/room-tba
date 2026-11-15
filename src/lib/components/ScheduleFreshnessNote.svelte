<script lang="ts">
	import {
		classesScheduleFreshnessMessage,
		isClassesScheduleStale
	} from '#lib/amis/term-schedule-freshness.js';
	import { changeOfMatriculationPeriod } from '#lib/utils/term/term-calendar.js';

	type Props = {
		importedAt?: string | null;
		termId?: number | null;
	};

	const { importedAt = null, termId = null }: Props = $props();

	const message = $derived(
		classesScheduleFreshnessMessage(importedAt, Date.now(), changeOfMatriculationPeriod(termId))
	);
	const stale = $derived(isClassesScheduleStale(importedAt));
</script>

{#if message}
	<p class="schedule-freshness" class:schedule-freshness--stale={stale}>
		{message}
		{#if stale}
			<a class="schedule-freshness__link" href="/?contribute=1">Report an issue</a>
		{/if}
	</p>
{/if}

<style>
	.schedule-freshness {
		margin: 0.35rem 0 0;
		font-size: 0.75rem;
		line-height: 1.35;
		color: var(--theme-text-2, hsl(0 0% 45%));
	}

	.schedule-freshness--stale {
		color: var(--theme-amber-text, hsl(25 70% 32%));
	}

	.schedule-freshness__link {
		margin-left: 0.35rem;
		color: inherit;
		text-decoration: underline;
	}
</style>
