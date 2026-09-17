<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import OrgResult from '$lib/components/controls/OrgResult.svelte';
	import MapEntityPin from '$lib/components/map/MapEntityPin.svelte';
	import PinGlyph from '$lib/components/map/PinGlyph.svelte';
	import { isStudentOrganization } from '$lib/constants/content/categories/org';
	import { map, queryStore, sidePanelStore } from '$lib/stores.svelte';
	import { getAppData } from '$lib/utils/context';
	import { withinMapZoom } from '$lib/utils/map/navigate';
	import { slugifySegment } from '$lib/utils/site';
	import type { OrgData } from '$lib/utils/types';
	import { Marker } from 'svelte-maplibre';

	interface Props {
		orgPinFilter: 'all' | 'student' | 'office' | 'none';
		zoomLevel: number;
	}

	const { orgPinFilter, zoomLevel }: Props = $props();

	const data = getAppData();
	const { organizations, loaded, buildings } = $derived(data());
	const filteredOrganizations = $derived.by(() => {
		if (!loaded || orgPinFilter === 'none') return [];
		return organizations.flatMap((org) => {
			if (orgPinFilter === 'student' && !isStudentOrganization(org.category)) {
				return [];
			}
			if (orgPinFilter === 'office' && isStudentOrganization(org.category)) {
				return [];
			}
			const position = organizationPosition(org);
			return position ? [{ org, ...position }] : [];
		});
	});
	function organizationPosition(org: OrgData) {
		let lat = org.lat;
		let lon = org.lon;
		if ((lat === null || lon === null) && org.buildingId !== null) {
			const host = (buildings ?? []).find((building) => building.id === org.buildingId);
			if (host) {
				lat = host.lat;
				lon = host.lon;
			}
		}
		return lat !== null && lon !== null ? { lat, lon } : null;
	}

	function handleMarkerClick({ name, id, lon, lat }: OrgData) {
		return () => {
			// if (eventPlacementStore.active) return;
			// if (isMapEditEnabled() && selectedEditKey !== null) return;
			if (queryStore.category === 'organization' && name === queryStore.inputValue) {
				sidePanelStore.expand();
				return;
			}
			queryStore.updateQuery({
				category: 'organization',
				type: 'result',
				value: name,
				id
			});
			queryStore.inputValue = name;
			goto(resolve(`/map/organizations/${slugifySegment(name)}-${id}`));
			sidePanelStore.openPanel({
				type: 'search-result',
				component: OrgResult
			});
			if (lon && lat) {
				map.centerMarker([lon, lat]);
			}
		};
	}
</script>

{#if withinMapZoom(zoomLevel)}
	{#each filteredOrganizations as { org, lat, lon } (`org:${org.id}`)}
		{#if map.isPoiPinsZoomVisible()}
			<!-- {@const centralHoverPreview = shouldShowEntityHoverPreview()}
		{@const previewSuppressed =
			centralHoverPreview && isOrganizationHoverPreview(entityHoverPreviewStore.entity, org.id)} -->
			<Marker lngLat={[lon, lat]} onclick={handleMarkerClick(org)}>
				<MapEntityPin
					label={org.name}
					tone={isStudentOrganization(org.category) ? 'organization' : 'office'}
					active={queryStore.isActiveMarker(org.name, 'organization')}
					dimmed={queryStore.hasActiveMarker()}
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
