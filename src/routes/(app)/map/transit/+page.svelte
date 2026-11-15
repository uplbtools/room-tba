<script lang="ts">
	import InfoPanel from '#lib/components/new/InfoPanel.svelte';
	import MapBrowseList from '#lib/components/map/MapBrowseList.svelte';
	import { getTransitRoutes } from '#lib/functions/transit.remote.js';
	import { transitRouteNoun } from '#lib/utils/transit/transit-route-kind.js';
</script>

<InfoPanel>
	<svelte:boundary>
		{#snippet failed()}
			<p class="p-3 text-sm">Couldn't load the routes. Try again.</p>
		{/snippet}
		<MapBrowseList
			heading="Jeepney and bus routes"
			entries={(await getTransitRoutes()).map((route) => ({
				href: `/map/transit/${encodeURIComponent(route.id)}`,
				label: `${route.name} ${transitRouteNoun(route)}`,
				description: route.description
			}))}
		/>
	</svelte:boundary>
</InfoPanel>
