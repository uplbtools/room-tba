<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { navigating } from '$app/state';
	import InfoPanel from '#lib/components/new/InfoPanel.svelte';
	import { getEventById } from '#lib/functions/events.remote.js';
	import { getMapStore, getSearchInfo } from '#lib/utils/context.js';
	import { onMount } from 'svelte';
	import EventResult from './EventResult.svelte';

	const { params } = $props();
	const searchInfo = getSearchInfo();
	const map = getMapStore();

	const event = $derived(getEventById(params.id));

	afterNavigate(syncSearchView);

	onMount(async () => {
		if (navigating.type) return;
		await syncSearchView();
	});

	async function syncSearchView() {
		const eventRes = await event;
		const location = eventRes.locations.find((l) => l.isPrimary) ?? eventRes.locations[0];
		if (location?.resolvedLon && location.resolvedLat) {
			map.centerMarker([location.resolvedLon, location.resolvedLat]);
		}
		searchInfo.updateQuery({
			category: 'event',
			type: 'result',
			value: eventRes.title
		});
	}
</script>

<svelte:head>
	<title>{(await event).title} | Room TBA Event</title>
</svelte:head>

<InfoPanel>
	<svelte:boundary>
		{#snippet failed()}
			failed to load
		{/snippet}
		{#snippet pending()}
			Loading...
		{/snippet}
		<EventResult event={await event} />
	</svelte:boundary>
</InfoPanel>
