<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { navigating } from '$app/state';
	import InfoPanel from '#lib/components/new/InfoPanel.svelte';
	import { getRoomById } from '#lib/functions/rooms.remote.js';
	import { getMapStore, getSearchInfo } from '#lib/utils/context.js';
	import { onMount } from 'svelte';
	import RoomResult from './RoomResult.svelte';

	const { params } = $props();
	const searchInfo = getSearchInfo();
	const map = getMapStore();

	const room = $derived(getRoomById(params.id));

	afterNavigate(syncSearchView);

	onMount(async () => {
		if (navigating.type) return;
		await syncSearchView();
	});

	async function syncSearchView() {
		const roomRes = await room;
		if (roomRes.lon && roomRes.lat) {
			map.centerMarker([roomRes.lon, roomRes.lat]);
		}
		searchInfo.updateQuery({
			category: 'room',
			type: 'result',
			value: roomRes.code
		});
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
		<RoomResult room={await room} />
	</svelte:boundary>
</InfoPanel>
