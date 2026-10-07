<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { navigating } from '$app/state';
	import { getOrgById } from '$lib/functions/organizations.remote.js';
	import { getMapStore, getSearchInfo } from '$lib/utils/context';
	import { onMount, untrack } from 'svelte';
	// import { onMount, untrack } from 'svelte';

	const { params } = $props();
	const searchInfo = getSearchInfo();
	const map = getMapStore();

	const org = $derived(getOrgById(params.id));

	afterNavigate(syncSearchView);

	onMount(async () => {
		if (navigating.type) return;
		await syncSearchView();
	});

	async function syncSearchView() {
		const orgRes = await org;
		if (orgRes.lon && orgRes.lat) {
			map.centerMarker([orgRes.lon, orgRes.lat]);
		}
		searchInfo.updateQuery({
			category: 'organization',
			type: 'result',
			value: orgRes.name
		});
	}
</script>

<svelte:head>
	<title>{(await org).name} | Room TBA Organization</title>
</svelte:head>
