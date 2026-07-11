<script lang="ts">
  import { onMount } from "svelte";
  import { getAppData } from "@lib/context";
  import { createEntityUrlSync } from "@lib/entity-url-sync";
  import {
    getBuildingCanonicalPath,
    getOrganizationCanonicalPath,
    getPlaceCanonicalPath,
    getRoomCanonicalPath,
  } from "@lib/entity-urls";
  import { orgCategoryLabel } from "@constants/org-categories";
  import { placeCategoryLabel } from "@constants/place-categories";
  import {
    resetDocumentMeta,
    updateTermAwareDocumentMeta,
  } from "@lib/term-document-meta";
  import {
    currentRoom,
    mapEditStore,
    plannerStore,
    queryStore,
    termStore,
  } from "@lib/store.svelte";

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
        queryStore.hydrateQuery(query);
      },
      clearQuery: () => {
        queryStore.clearQuery();
      },
      getQuerySnapshot: () => ({
        type: queryStore.type,
        category: queryStore.category,
        value: queryStore.queryValue,
        eventSlug: queryStore.selectedEventSlug ?? undefined,
      }),
      setPlannerOpen: (open) => {
        if (open) plannerStore.openPlanner();
        else plannerStore.close();
      },
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
      type: queryStore.type,
      category: queryStore.category,
      value: queryStore.queryValue,
      eventSlug: queryStore.selectedEventSlug ?? undefined,
      room: currentRoom.value,
      editMode: mapEditStore.enabled,
      termId: termStore.activeTermId,
      defaultTermId: termStore.defaultTermId,
      plannerOpen: plannerStore.open,
    });
  });

  $effect(() => {
    if (queryStore.type !== "result" || queryStore.category === null) {
      resetDocumentMeta();
      return;
    }

    const termLabel = termStore.activeTerm?.label ?? null;
    const termId = termStore.activeTermId;
    const defaultTermId = termStore.defaultTermId;

    if (queryStore.category === "room" && currentRoom.value) {
      const room = currentRoom.value;
      updateTermAwareDocumentMeta({
        baseTitle: `${room.code} | Room at UPLB`,
        baseDescription: room.building?.name
          ? `Find ${room.code} at UPLB in ${room.building.name} with directions and listed classes.`
          : `Find ${room.code} at UPLB with directions and listed classes.`,
        canonicalPath: getRoomCanonicalPath(room),
        termLabel,
        termId,
        defaultTermId,
      });
      return;
    }

    if (queryStore.category === "building") {
      const buildingName = queryStore.queryValue;
      updateTermAwareDocumentMeta({
        baseTitle: `${buildingName} | Building at UPLB`,
        baseDescription: `Find rooms in ${buildingName} at UPLB with map context and class schedules by room.`,
        canonicalPath: getBuildingCanonicalPath(buildingName),
        termLabel,
        termId,
        defaultTermId,
      });
      return;
    }

    if (queryStore.category === "organization") {
      const organization = appData().organizations?.find(
        (entry) => entry.name === queryStore.queryValue,
      );
      if (!organization) return;
      const category = orgCategoryLabel(organization.category) ?? "Organization";
      updateTermAwareDocumentMeta({
        baseTitle: `${organization.name} | ${category} at UPLB`,
        baseDescription: organization.description ??
          `Find ${organization.name}, a ${category.toLowerCase()} at UPLB, on the campus map.`,
        canonicalPath: getOrganizationCanonicalPath(organization),
        termLabel,
        termId,
        defaultTermId,
      });
      return;
    }

    if (queryStore.category === "place") {
      const place = appData().places?.find(
        (entry) => entry.name === queryStore.queryValue,
      );
      if (!place) return;
      const category = placeCategoryLabel(place.category) ?? "Campus place";
      updateTermAwareDocumentMeta({
        baseTitle: `${place.name} | ${category} at UPLB`,
        baseDescription: place.description ??
          `Find ${place.name}, a ${category.toLowerCase()} at UPLB, on the campus map.`,
        canonicalPath: getPlaceCanonicalPath(place),
        termLabel,
        termId,
        defaultTermId,
      });
      return;
    }

    resetDocumentMeta();
  });
</script>
