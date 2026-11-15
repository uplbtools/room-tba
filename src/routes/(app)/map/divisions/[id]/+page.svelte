<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { navigating } from '$app/state';
	import InfoPanel from '#lib/components/new/InfoPanel.svelte';
	import { getDivisionById } from '#lib/functions/divisions.remote.js';
	import { getSearchInfo } from '#lib/utils/context.js';
	import { onMount } from 'svelte';
	import DivisionResult from './DivisionResult.svelte';

	const { params } = $props();
	const searchInfo = getSearchInfo();

	const division = $derived(getDivisionById(params.id));

	afterNavigate(syncSearchView);

	onMount(async () => {
		if (navigating.type) return;
		await syncSearchView();
	});

	async function syncSearchView() {
		const res = await division;
		searchInfo.updateQuery({ category: 'division', type: 'result', value: res.divisionName });
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
		<DivisionResult division={await division} />
	</svelte:boundary>
</InfoPanel>
