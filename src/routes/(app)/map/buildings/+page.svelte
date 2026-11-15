<script lang="ts">
	import MapBrowseList from '#lib/components/map/MapBrowseList.svelte';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<MapBrowseList heading="Buildings" entries={data.items} />
