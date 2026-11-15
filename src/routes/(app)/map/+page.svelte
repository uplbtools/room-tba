<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { getSearchInfo } from '#lib/utils/context.js';

	const searchInfo = getSearchInfo();

	afterNavigate(({ shallow, type }) => {
		if (shallow && type === 'goto') return;

		searchInfo.clearSearch();
	});
</script>

<!-- The map itself is the layout. This route is the plain map view: no entity
     selected and no browse list, so it contributes nothing to the side panel. -->
