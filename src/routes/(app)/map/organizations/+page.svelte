<script lang="ts">
	import MapBrowseList from '#lib/components/map/MapBrowseList.svelte';
	import { isStudentOrganization } from '#lib/constants/content/categories/org.js';
	import { getAppData } from '#lib/utils/context.js';
	import { getOrganizationCanonicalPath } from '#lib/utils/entity/entity-urls.js';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
	const appData = getAppData();

	// `data.items` is the server list: it is what crawlers and the first paint
	// see. The PGlite rows are the offline fallback for when the load never
	// reached the network, so they fill in only when the server list is empty.
	// The category filter mirrors the one the server load applies, so an offline
	// list never shows units under the student-organization heading.
	const entries = $derived(
		data.items.length > 0
			? data.items
			: (appData().organizations ?? [])
					.filter((organization) => isStudentOrganization(organization.category))
					.sort((a, b) => a.name.localeCompare(b.name))
					.map((organization) => ({
						href: getOrganizationCanonicalPath(organization),
						label: organization.name
					}))
	);
</script>

<MapBrowseList heading="Organizations" {entries} />
