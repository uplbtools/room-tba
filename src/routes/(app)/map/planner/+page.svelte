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
	import { decodeGroup, decodeSharePlan } from '#lib/utils/planner/share-codec.js';
	import PlannerScreen from './PlannerScreen.svelte';

	const plannerStore = getPlannerStore();
	const termStore = getTermStore();
	const toastStore = getToast();
	const ready = browser ? termStore.init().then(plannerStore.init) : null;

	const programParam = page.url.searchParams.get('program');
	if (browser && programParam) writeLocalJson(PLANNER_PROGRAM_KEY, programParam.toUpperCase());

	async function openLink(termId: number | undefined) {
		if (termId === undefined) {
			await goto(resolve('map/planner'), { replaceState: true });
			toastStore.show('That plan link is invalid.', 'error');
			return false;
		}
		await ready;
		if (!termStore.terms.find((term) => term.id === termId)?.classCount) {
			toastStore.show(
				"The class schedule for that term isn't out yet. Open this link again once it is.",
				'info'
			);
			return false;
		}
		await goto(resolve('map/planner'), { replaceState: true });
		return true;
	}

	// Save friends' schedules from a group link (?group=).
	onMount(async () => {
		const groupParam = page.url.searchParams.get('group');
		if (!groupParam) return;
		const decoded = decodeGroup(groupParam);
		if (!(await openLink(decoded?.termId)) || !decoded) return;
		const members = await Promise.all(
			decoded.members.map(async (member) => ({
				name: member.name,
				sections: (await resolveSharedPlan({ termId: decoded.termId, refs: member.refs })).sections
			}))
		);
		const added = plannerStore.setFriends(decoded.termId, members);
		termStore.setTerm(decoded.termId);
		toastStore.show(
			added.length ? `Added ${added.join(', ')}` : "You're the only one in this link so far.",
			'success'
		);
	});

	// Import a plan from a share link (?plan=).
	onMount(async () => {
		const planParam = page.url.searchParams.get('plan');
		if (!planParam) return;
		const decoded = decodeSharePlan(planParam);
		if (!(await openLink(decoded?.termId)) || !decoded) return;
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
