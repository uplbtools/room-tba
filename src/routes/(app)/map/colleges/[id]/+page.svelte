<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { navigating } from '$app/state';
	import InfoPanel from '#lib/components/new/InfoPanel.svelte';
	import { getCollegeById } from '#lib/functions/colleges.remote.js';
	import { getSearchInfo } from '#lib/utils/context.js';
	import { onMount } from 'svelte';
	import CollegeResult from './CollegeResult.svelte';

	const { params } = $props();
	const searchInfo = getSearchInfo();

	const college = $derived(getCollegeById(params.id));

	afterNavigate(syncSearchView);

	onMount(async () => {
		if (navigating.type) return;
		await syncSearchView();
	});

	async function syncSearchView() {
		const res = await college;
		searchInfo.updateQuery({ category: 'college', type: 'result', value: res.collegeName });
	}
</script>

<InfoPanel>
	<svelte:boundary>
		{#snippet failed()}
			failed to load
		{/snippet}
		{#snippet pending()}
			Loading...
		{/snippet}
		<CollegeResult college={await college} />
	</svelte:boundary>
</InfoPanel>
