<script lang="ts">
	import MapBrowseList from '#lib/components/map/MapBrowseList.svelte';
	import { getAppData } from '#lib/utils/context.js';
	import { getDivisionCanonicalPath } from '#lib/utils/entity/entity-urls.js';
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
			: (appData().divisions ?? [])
					.slice()
					.sort((a, b) => a.divisionName.localeCompare(b.divisionName))
					.map((division) => ({
						href: getDivisionCanonicalPath(division.divisionName),
						label: division.divisionName
					}))
	);
</script>

<MapBrowseList heading="Divisions" {entries} />
