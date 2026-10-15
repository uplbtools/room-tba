<script lang="ts">
	import MapBrowseList from '#lib/components/map/MapBrowseList.svelte';
	import { getAppData } from '#lib/utils/context.js';
	import { getBuildingCanonicalPath } from '#lib/utils/entity/entity-urls.js';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
	const appData = getAppData();

	// `data.items` is the server list: it is what crawlers and the first paint
	// see, and it carries counts the local cache cannot compute on its own. The
	// PGlite rows are the offline fallback for when the load never reached the
	// network, so they fill in only when the server list is empty.
	const entries = $derived(
		data.items.length > 0
			? data.items
			: (appData().buildings ?? [])
					.slice()
					.sort((a, b) => a.buildingName.localeCompare(b.buildingName))
					.map((building) => ({
						href: getBuildingCanonicalPath(building.buildingName),
						label: building.buildingName,
						description: building.directions ? 'Directions available' : null
					}))
	);
</script>

<MapBrowseList heading="Buildings" {entries} />
