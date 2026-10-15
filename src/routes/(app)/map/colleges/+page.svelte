<script lang="ts">
	import MapBrowseList from '#lib/components/map/MapBrowseList.svelte';
	import { getAppData } from '#lib/utils/context.js';
	import { getCollegeCanonicalPath } from '#lib/utils/entity/entity-urls.js';
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
			: (appData().colleges ?? [])
					.slice()
					.sort((a, b) => a.collegeName.localeCompare(b.collegeName))
					.map((college) => ({
						href: getCollegeCanonicalPath(college.collegeName),
						label: college.collegeName
					}))
	);
</script>

<MapBrowseList heading="Colleges" {entries} />
