<script lang="ts">
	import MapBrowseList from '#lib/components/map/MapBrowseList.svelte';
	import { getAppData } from '#lib/utils/context.js';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
	const appData = getAppData();
	// Rooms have no local browse list: the cached rows carry no building context
	// to label them with, so the panel falls back to the count plus search.
	const totalRooms = $derived(appData().totalRooms);
</script>

<MapBrowseList heading="Rooms" entries={data.items}>
	{#snippet empty()}
		<p class="rooms-note">
			{totalRooms
				? `${totalRooms} rooms are mapped on this campus.`
				: 'Room data is still syncing.'}
			Search from the panel above to jump to one.
		</p>
	{/snippet}
</MapBrowseList>

<style>
	.rooms-note {
		margin: 0;
		padding: 0.75rem;
		color: hsl(0, 0%, 45%);
		font-size: 0.8125rem;
		line-height: 1.5;
	}
</style>
