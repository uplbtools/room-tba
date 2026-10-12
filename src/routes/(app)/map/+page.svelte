<!-- The map itself is the layout. This route is the plain map view: no entity
     selected and no browse list, so it contributes nothing to the side panel. -->

<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { getSearchInfo } from '$lib/utils/context';

	const searchInfo = getSearchInfo();
	afterNavigate(() => {
		searchInfo.clearSearch();
	});
</script>
