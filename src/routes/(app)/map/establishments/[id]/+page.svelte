<!-- The map layout hydrates the query from `data.initialSearch` and the side
     panel resolves the result view from its category, so this route renders no
     body of its own — the URL is what selects the entity. -->
<script lang="ts">
	import { getSearchInfo } from '$lib/utils/context';
	import { onMount } from 'svelte';

	const searchInfo = getSearchInfo();

	// searchInfo.updateQuery({

	// })
</script>
