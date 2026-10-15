<script lang="ts">
	import MapBrowseList from '#lib/components/map/MapBrowseList.svelte';
	import { placeCategoryLabel } from '#lib/constants/content/categories/place.js';
	import { getAppData } from '#lib/utils/context.js';
	import { getPlaceCanonicalPath } from '#lib/utils/entity/entity-urls.js';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
	const appData = getAppData();

	// Server list first, cached rows only as the offline fallback.
	const entries = $derived(
		data.items.length > 0
			? data.items
			: (appData().places ?? [])
					.slice()
					.sort((a, b) => a.name.localeCompare(b.name))
					.map((place) => ({
						href: getPlaceCanonicalPath(place),
						label: place.name,
						description: placeCategoryLabel(place.category)
					}))
	);
</script>

<MapBrowseList heading="Places" {entries} />
