<script lang="ts">
	import { getFinalExams } from '#lib/functions/final-exams.remote.js';
	import { getSearchInfo, getTermStore } from '#lib/utils/context.js';
	import { looksLikeCourseCode } from '#lib/utils/final-exams/final-exams.js';
	import { normalizeCourseCode } from '#lib/utils/final-exams/normalize.js';

	interface Props {
		onSelect: () => void;
	}

	const { onSelect }: Props = $props();
	const searchInfo = getSearchInfo();
	const termStore = getTermStore();

	const query = $derived(searchInfo.queryValue.trim());
	const courseCode = $derived(normalizeCourseCode(query));
	const termId = $derived(termStore.activeTermId);

	function openFinalExams() {
		searchInfo.updateQuery({
			category: 'class',
			type: 'result',
			value: query
		});
		onSelect();
	}
</script>

{#if courseCode && termId != null && looksLikeCourseCode(courseCode)}
	<svelte:boundary>
		{#snippet pending()}
			<div class="final-exam-suggestion">
				<div>Checking final exams for <strong>{query}</strong>…</div>
			</div>
		{/snippet}
		{#snippet failed()}{/snippet}
		{@const matchCount = (await getFinalExams({ termId, courseCode })).length}
		{#if matchCount > 0}
			<button type="button" class="final-exam-suggestion" onclick={openFinalExams}>
				<div>
					View final exam for <strong>{query}</strong>
					{#if matchCount > 1}
						({matchCount} sections)
					{/if}
				</div>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
					><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"
					></polyline></svg
				>
			</button>
		{/if}
	</svelte:boundary>
{/if}

<style>
	.final-exam-suggestion {
		all: unset;
		padding: 0.5rem 0.75rem;
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.final-exam-suggestion:hover {
		background-color: hsl(0, 0%, 95%);
		border-radius: 0.75rem;
	}

	.final-exam-suggestion strong {
		color: hsl(5, 53%, 32%);
	}
</style>
