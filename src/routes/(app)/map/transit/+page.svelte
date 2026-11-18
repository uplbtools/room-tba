<script lang="ts">
	import InfoPanel from '#lib/components/new/InfoPanel.svelte';
	import MapBrowseList from '#lib/components/map/MapBrowseList.svelte';
	import { getTransitRoutes } from '#lib/functions/transit.remote.js';
	import { transitRouteNoun } from '#lib/utils/transit/transit-route-kind.js';
	import RouteBadge from './RouteBadge.svelte';
</script>

<svelte:boundary>
	{#snippet failed()}
		<InfoPanel>
			<p class="p-3 text-sm">Couldn't load the routes. Try again.</p>
		</InfoPanel>
	{/snippet}
	{@const routes = await getTransitRoutes()}
	<MapBrowseList
		heading="Jeep & bus routes"
		entries={routes.map((route) => ({
			href: `/map/transit/${encodeURIComponent(route.id)}`,
			label: `${route.name} ${transitRouteNoun(route)}`,
			description: route.description
		}))}
	>
		{#snippet leading(i)}
			<RouteBadge route={routes[i]} />
		{/snippet}
	</MapBrowseList>
</svelte:boundary>
