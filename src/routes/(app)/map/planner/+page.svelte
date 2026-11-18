<script lang="ts">
	import { browser } from '$app/env';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { getPlannerStore, getTermStore, getToast } from '#lib/utils/context.js';
	import { writeLocalJson } from '#lib/utils/locStorage.js';
	import { resolveSharedPlan } from '#lib/utils/planner/import-shared.js';
	import { PLANNER_PROGRAM_KEY } from '#lib/utils/planner/program-courses.js';
	import { decodeSharePlan } from '#lib/utils/planner/share-codec.js';
	import PlannerScreen from './PlannerScreen.svelte';

	const plannerStore = getPlannerStore();
	const termStore = getTermStore();
	const toastStore = getToast();
	const ready = browser ? termStore.init().then(plannerStore.init) : null;

	const programParam = page.url.searchParams.get('program');
	if (browser && programParam) writeLocalJson(PLANNER_PROGRAM_KEY, programParam.toUpperCase());

	// Import a plan from a share link (?plan=).
	onMount(async () => {
		const planParam = page.url.searchParams.get('plan');
		if (!planParam) return;
		const decoded = decodeSharePlan(planParam);
		if (!decoded) {
			await goto(resolve('map/planner'), { replaceState: true });
			toastStore.show('That plan link is invalid.', 'error');
			return;
		}
		await ready;
		if (!termStore.terms.find((term) => term.id === decoded.termId)?.classCount) {
			toastStore.show(
				"The class schedule for that term isn't out yet. Open this link again once it is.",
				'info'
			);
			return;
		}
		await goto(resolve('map/planner'), { replaceState: true });
		const { sections, missing } = await resolveSharedPlan(decoded);
		plannerStore.importShared(decoded.termId, sections);
		termStore.setTerm(decoded.termId);
		if (missing > 0) {
			toastStore.show(
				`${missing} ${missing === 1 ? "class isn't" : "classes aren't"} offered this term.`,
				'info'
			);
		}
	});
</script>

{#await ready then}
	<PlannerScreen />
{/await}
