<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import MapEntityPin from '$lib/components/map/MapEntityPin.svelte';
	import PinGlyph from '$lib/components/map/PinGlyph.svelte';
	import { isStudentOrganization } from '$lib/constants/content/categories/org';
	import { getMapOrgsData } from '$lib/functions/organizations.remote';
	import { getMapStore, getSearchInfo } from '$lib/utils/context';
	import { slugifySegment } from '$lib/utils/site';
	import type { OrgData } from '$lib/utils/types';
	import { Marker } from 'svelte-maplibre';

	interface Props {
		orgPinFilter: 'all' | 'student' | 'office' | 'none';
		zoomLevel: number;
	}

	const { orgPinFilter, zoomLevel }: Props = $props();
	const map = getMapStore();
	const searchInfo = getSearchInfo();
	const organizations = await getMapOrgsData();

	const filteredOrganizations = $derived.by(() => {
		// return organizations;
		// if (!loaded || orgPinFilter === 'none') return [];
		return organizations;
		// .flatMap((org) => {
		// 	if (orgPinFilter === 'student' && !isStudentOrganization(org.category)) {
		// 		return [];
		// 	}
		// 	if (orgPinFilter === 'office' && isStudentOrganization(org.category)) {
		// 		return [];
		// 	}
		// 	// const position = organizationPosition(org);
		// 	return /* position ?  */ ; /* : [] */
		// });
	});

	function handleMarkerClick(org: (typeof filteredOrganizations)[number]) {
		return async () => {
			await goto(resolve(`/map/organizations/${org.id}`));
			if (org.lon && org.lat) map.centerMarker([org.lon, org.lat]);
		};
	}
</script>

{#if map.withinZoom(zoomLevel)}
	{#each filteredOrganizations as org (`org:${org.id}`)}
		{#if org.lon !== null && org.lat !== null}
			<!-- {@const centralHoverPreview = shouldShowEntityHoverPreview()}
		{@const previewSuppressed =
			centralHoverPreview && isOrganizationHoverPreview(entityHoverPreviewStore.entity, org.id)} -->
			<Marker lngLat={[org.lon ?? 0, org.lat ?? 0]} onclick={handleMarkerClick(org)}>
				<MapEntityPin
					label={org.name}
					tone={isStudentOrganization(org.category) ? 'organization' : 'office'}
					active={searchInfo.isActiveMarker(org.name, 'organization')}
					dimmed={searchInfo.hasActiveResult()}
					// active={searchInfo.isActiveMarker(org.name, 'organization')}
					// dimmed={searchInfo.hasActiveMarker()}
					// labelVisible={(isStudentOrganization(org.category)
				>
					{#if isStudentOrganization(org.category)}
						<PinGlyph name="organization" size={16} />
					{:else}
						<PinGlyph name="office" size={16} />
					{/if}
				</MapEntityPin>
			</Marker>
		{/if}
	{/each}
{/if}
