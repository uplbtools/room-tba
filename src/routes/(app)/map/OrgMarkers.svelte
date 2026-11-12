<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import MapEntityPin from '#lib/components/map/MapEntityPin.svelte';
	import PinGlyph from '#lib/components/map/PinGlyph.svelte';
	import { isStudentOrganization } from '#lib/constants/content/categories/org.js';
	import { getMapOrgsData } from '#lib/functions/organizations.remote.js';
	import { getMapStore, getSearchInfo } from '#lib/utils/context.js';
	import { hasLocation } from '#lib/utils/map/marker.js';

	interface Props {
		orgPinFilter: 'all' | 'student' | 'office' | 'none';
		zoomLevel: number;
	}

	const { orgPinFilter, zoomLevel }: Props = $props();
	const map = getMapStore();
	const searchInfo = getSearchInfo();
	const organizations = await getMapOrgsData();

	function handleMarkerClick(org: (typeof organizations)[number]) {
		return async () => {
			await goto(resolve(`map/organizations/${org.id}`));
			if (org.lon && org.lat) map.centerMarker([org.lon, org.lat]);
		};
	}
</script>

{#each organizations as org (`org:${org.id}`)}
	{#if hasLocation(org) && (map.withinZoom(zoomLevel) || searchInfo.isActiveMarker(org.name, 'organization'))}
		<MapEntityPin
			label={org.name}
			lngLat={[org.lon, org.lat]}
			onclick={handleMarkerClick(org)}
			tone={isStudentOrganization(org.category) ? 'organization' : 'office'}
			active={searchInfo.isActiveMarker(org.name, 'organization')}
			dimmed={searchInfo.hasActiveResult()}
		>
			{#if // active={searchInfo.isActiveMarker(org.name, 'organization')}
			// dimmed={searchInfo.hasActiveMarker()}
			// labelVisible={(isStudentOrganization(org.category)
			isStudentOrganization(org.category)}
				<PinGlyph name="organization" size={14} />
			{:else}
				<PinGlyph name="office" size={14} />
			{/if}
		</MapEntityPin>
	{/if}
{/each}
