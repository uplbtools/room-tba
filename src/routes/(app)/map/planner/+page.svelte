<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { getPlannerStore, getTermStore, getToast } from '#lib/utils/context.js';
	import { resolveSharedPlan } from '#lib/utils/planner/import-shared.js';
	import { decodeSharePlan } from '#lib/utils/planner/share-codec.js';
	import PlannerScreen from './PlannerScreen.svelte';

	const plannerStore = getPlannerStore();
	const termStore = getTermStore();
	const toastStore = getToast();

	// Import a plan from a share link (?plan=).
	onMount(async () => {
		const planParam = page.url.searchParams.get('plan');
		if (!planParam) return;
		await goto(resolve('map/planner'), { replaceState: true });
		const decoded = decodeSharePlan(planParam);
		if (!decoded) {
			toastStore.show('That plan link is invalid.', 'error');
			return;
		}
		const { sections, missing } = await resolveSharedPlan(decoded);
		plannerStore.importShared(decoded.termId, sections);
		termStore.setTerm(decoded.termId);
		if (missing > 0) {
			toastStore.show(
				`${missing} shared ${missing === 1 ? 'section is' : 'sections are'} no longer offered.`,
				'info'
			);
		}
	});
</script>

<svelte:head>
	<title>Class Planner | Room TBA</title>
</svelte:head>

<PlannerScreen />
