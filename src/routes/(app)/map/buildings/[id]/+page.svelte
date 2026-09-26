<!-- The map layout hydrates the query from `data.initialSearch` and the side
     panel resolves the result view from its category, so this route renders no
     body of its own — the URL is what selects the entity. -->

<script lang="ts">
	import { page } from '$app/state';
	import { getBuildingById } from '$lib/functions/buildings.remote';
	import { PageIdParam } from '$lib/schema/functions';
	import { getSearchInfo } from '$lib/utils/context';
	import { onMount, untrack } from 'svelte';

	const searchInfo = getSearchInfo();

	const data = $derived(await getBuildingById(page.params.id));
</script>
