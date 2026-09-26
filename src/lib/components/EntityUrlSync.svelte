<script lang="ts">
	import { onMount } from 'svelte';
	import { getAppData } from '$lib/utils/context';
	import { createEntityUrlSync, isScreenId } from '$lib/utils/entity/entity-url-sync';
	import { openCampusBrowse } from '$lib/utils/campus/browse-campus';
	import { getTransitStopIndex } from '$lib/utils/transit-urls';
	import { campusTransit } from '$lib/campus.config';
	import {
		getBuildingCanonicalPath,
		getOrganizationCanonicalPath,
		getPlaceCanonicalPath,
		getRoomCanonicalPath
	} from '$lib/utils/entity/entity-urls';
	import { orgCategoryLabel } from '$lib/constants/content/categories/org';
	import { placeCategoryLabel } from '$lib/constants/content/categories/place';
	import {
		resetDocumentMeta,
		updateTermAwareDocumentMeta
	} from '$lib/utils/term/term-document-meta';
	import {
		currentRoom,
		jeepneyStore,
		mapEditStore,
		searchInfo,
		sidePanelStore,
		sidebarStore,
		termStore,
		transitStore
	} from '$lib/stores.svelte';

	const appData = getAppData();
	let sync = $state<ReturnType<typeof createEntityUrlSync> | null>(null);

	onMount(() => {
		// Create + init synchronously. Don't gate the controller on termStore.init()
		// resolving: init() only reads the current term ids (and the term param
		// already in the URL), and the $effect below re-syncs reactively once term
		// data arrives. Gating meant a slow/failed term load left `sync` null and
		// silently broke all entity URL syncing (SEO + shareable links).
		const controller = createEntityUrlSync({
			getAppData: appData,
			hydrateQuery: (query) => {
				searchInfo.hydrateQuery(query);
			},
			clearQuery: () => {
				searchInfo.clearQuery();
			},
			getQuerySnapshot: () => ({
				type: searchInfo.type,
				category: searchInfo.category,
				value: searchInfo.queryValue,
				eventSlug: searchInfo.selectedEventSlug ?? undefined
			}),
			setScreen: (screen) => {
				sidebarStore.changeOpened(screen ?? 'map');
			},
			setTransit: async ({ routeId, stopSlug }) => {
				if (!campusTransit.enabled) return;
				openCampusBrowse(searchInfo, sidePanelStore, 'jeepney');
				if (!routeId) return;
				await transitStore.refresh();
				const route = transitStore.getRoute(routeId);
				if (!route) return;
				jeepneyStore.openRouteOnMap(route.id);
				const stopIndex = stopSlug ? getTransitStopIndex(route, stopSlug) : -1;
				if (stopIndex >= 0) {
					requestAnimationFrame(() => jeepneyStore.openStop(stopIndex));
				}
			}
		});

		controller.init();
		sync = controller;
		void termStore.init();

		return () => {
			sync?.destroy();
			sync = null;
			resetDocumentMeta();
		};
	});

	$effect(() => {
		sync?.syncFromQuery({
			type: searchInfo.type,
			category: searchInfo.category,
			value: searchInfo.queryValue,
			eventSlug: searchInfo.selectedEventSlug ?? undefined,
			room: currentRoom.value,
			editMode: mapEditStore.enabled,
			termId: termStore.activeTermId,
			defaultTermId: termStore.defaultTermId,
			screen: isScreenId(sidebarStore.panelOpen) ? sidebarStore.panelOpen : null,
			transitRouteId: jeepneyStore.selectedRouteId,
			transitStopIndex: jeepneyStore.selectedStopIndex,
			transitRoute: transitStore.getRoute(jeepneyStore.selectedRouteId)
		});
	});

	$effect(() => {
		if (searchInfo.type !== 'result' || searchInfo.category === null) {
			resetDocumentMeta();
			return;
		}

		const termLabel = termStore.activeTerm?.label ?? null;
		const termId = termStore.activeTermId;
		const defaultTermId = termStore.defaultTermId;

		if (searchInfo.category === 'room' && currentRoom.value) {
			const room = currentRoom.value;
			updateTermAwareDocumentMeta({
				baseTitle: `${room.code} | Room at UPLB`,
				baseDescription: room.building?.name
					? `Find ${room.code} at UPLB in ${room.building.name} with directions and listed classes.`
					: `Find ${room.code} at UPLB with directions and listed classes.`,
				canonicalPath: getRoomCanonicalPath(room),
				termLabel,
				termId,
				defaultTermId
			});
			return;
		}

		if (searchInfo.category === 'building') {
			const buildingName = searchInfo.queryValue;
			updateTermAwareDocumentMeta({
				baseTitle: `${buildingName} | Building at UPLB`,
				baseDescription: `Find rooms in ${buildingName} at UPLB with map context and class schedules by room.`,
				canonicalPath: getBuildingCanonicalPath(buildingName),
				termLabel,
				termId,
				defaultTermId
			});
			return;
		}

		if (searchInfo.category === 'organization') {
			const organization = appData().organizations?.find(
				(entry) => entry.name === searchInfo.queryValue
			);
			if (!organization) return;
			const category = orgCategoryLabel(organization.category) ?? 'Organization';
			updateTermAwareDocumentMeta({
				baseTitle: `${organization.name} | ${category} at UPLB`,
				baseDescription:
					organization.description ??
					`Find ${organization.name}, a ${category.toLowerCase()} at UPLB, on the campus map.`,
				canonicalPath: getOrganizationCanonicalPath(organization),
				termLabel,
				termId,
				defaultTermId
			});
			return;
		}

		if (searchInfo.category === 'place') {
			const place = appData().places?.find((entry) => entry.name === searchInfo.queryValue);
			if (!place) return;
			const category = placeCategoryLabel(place.category) ?? 'Campus place';
			updateTermAwareDocumentMeta({
				baseTitle: `${place.name} | ${category} at UPLB`,
				baseDescription:
					place.description ??
					`Find ${place.name}, a ${category.toLowerCase()} at UPLB, on the campus map.`,
				canonicalPath: getPlaceCanonicalPath(place),
				termLabel,
				termId,
				defaultTermId
			});
			return;
		}

		resetDocumentMeta();
	});
</script>
