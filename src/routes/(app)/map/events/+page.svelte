<script lang="ts">
	import MapBrowseList from '#lib/components/map/MapBrowseList.svelte';
	import { getAppData } from '#lib/utils/context.js';
	import { getEventCanonicalPath } from '#lib/utils/entity/entity-urls.js';
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
			: (appData().events ?? []).map((event) => ({
					href: getEventCanonicalPath(event.slug),
					label: event.title,
					description: event.category
				}))
	);
</script>

<MapBrowseList heading="Events" {entries} />
