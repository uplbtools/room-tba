<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Route from "@lucide/svelte/icons/route";
  import EntityPanelClose from "./EntityPanelClose.svelte";
  import EntityShareCopyLink from "./EntityShareCopyLink.svelte";
  import EntityDirectionsChip from "./EntityDirectionsChip.svelte";
  import EntityLastUpdated from "../EntityLastUpdated.svelte";
  import EntityEditorToggle from "@ui/editor/EntityEditorToggle.svelte";
  import EntityEditorPanel from "@ui/editor/EntityEditorPanel.svelte";
  import EntityEditorFormField from "@ui/editor/EntityEditorFormField.svelte";
  import EntityEditorCard from "@ui/editor/EntityEditorCard.svelte";
  import EntityEditorPinRow from "@ui/editor/EntityEditorPinRow.svelte";
  import EntityEditorSubmitButton from "@ui/editor/EntityEditorSubmitButton.svelte";
  import ImageUpload from "@ui/editor/ImageUpload.svelte";
  import { fieldSaveActionLabel } from "@lib/editor/field-action-label";
  import { getAppActions, getAppData } from "@lib/context";
  import {
    adminAuthStore,
    eventPlacementStore,
    mapEditStore,
    mapProposalStore,
    mapStore,
    queryStore,
    toastStore,
  } from "@lib/store.svelte";
  import {
    getStoredProposalForEntity,
    persistEntityChange,
  } from "@lib/proposals/client";
  import { CAMPUS_DEFAULT_CAMERA } from "@constants/map-terrain";
  import { getEventImage } from "@lib/event-images";
  import {
    campusInputToWallString,
    formatCampusDateTime,
    instantToCampusInput,
  } from "@lib/event-time";
  import { getEventShareUrl } from "@lib/share-links";
  import type { EventData } from "@lib/types";
  import {
    clearEntityContributorDraft,
    readEntityContributorDraft,
    scheduleEntityContributorDraftSave,
  } from "@lib/contributor-drafts";

  const STATUS_LABELS: Record<EventData["status"], string> = {
    active: "Happening now",
    upcoming: "Upcoming",
    past: "Past",
  };

  const appData = getAppData();
  const appActions = getAppActions();
  const { events, loaded, buildings, dorms } = $derived(appData());
  const event = $derived(
    loaded
      ? queryStore.selectedEventSlug
        ? (events.find((item) => item.slug === queryStore.selectedEventSlug) ??
          null)
        : (events.find((item) => item.title === queryStore.queryValue) ?? null)
      : null,
  );
  const shareUrl = $derived(event ? getEventShareUrl(event.slug) : "");
  const eventImage = $derived(
    event ? getEventImage(event.slug, event.imageUrl, event.title) : null,
  );
  const primaryLocation = $derived(
    event
      ? (event.locations.find((location) => location.isPrimary) ??
          event.locations[0] ??
          null)
      : null,
  );

  let editing = $state(false);
  let saving = $state(false);
  let savingLocation = $state(false);
  let deactivating = $state(false);
  let form = $state({
    title: "",
    description: "",
    category: "other",
    startsAt: "",
    endsAt: "",
    sourceUrl: "",
    imageUrl: null as string | null,
    recurrence: "none" as EventData["recurrence"],
  });
  let locationForm = $state({
    anchorType: "custom" as EventData["locations"][number]["anchorType"],
    buildingId: "" as number | "",
    dormId: "" as number | "",
    label: "",
  });
  let routeForms = $state<{ id: number; name: string; description: string }[]>(
    [],
  );
  let submitterNameDraft = $state("");
  let activeProposalId = $state<number | null>(null);
  let draftEventId = $state<number | null>(null);
  const canPublish = $derived(adminAuthStore.canPublish);

  $effect(() => {
    const current = event;
    if (!current) return;
    if (draftEventId === current.id) return;
    draftEventId = current.id;

    if (canPublish) return;
    const saved = readEntityContributorDraft("event", current.id);
    if (!saved) return;
    // if (saved.editing) editing = true;
    const savedForm = saved.fields.form;
    if (savedForm && typeof savedForm === "object") {
      form = { ...form, ...(savedForm as typeof form) };
    }
    const savedLocationForm = saved.fields.locationForm;
    if (savedLocationForm && typeof savedLocationForm === "object") {
      locationForm = {
        ...locationForm,
        ...(savedLocationForm as typeof locationForm),
      };
    }
    const savedRouteForms = saved.fields.routeForms;
    if (Array.isArray(savedRouteForms)) {
      routeForms = savedRouteForms as typeof routeForms;
    }
  });

  $effect(() => {
    if (canPublish || !editing || !event) return;
    form;
    locationForm;
    routeForms;
    scheduleEntityContributorDraftSave("event", event.id, () => ({
      editing: true,
      fields: { form, locationForm, routeForms },
    }));
  });

  $effect(() => {
    if (!event || editing) return;
    form = eventToForm(event);
    syncLocationForm(event);
    routeForms = event.routes.map((route) => ({
      id: route.id,
      name: route.name,
      description: route.description ?? "",
    }));
  });

  $effect(() => {
    if (!event || !eventPlacementStore.consumeCreatedEvent(event.id)) return;
    form = eventToForm(event);
    editing = true;
  });

  function closeEventDetails() {
    editing = false;
    queryStore.clearQuery();
  }

  function eventToForm(event: EventData) {
    return {
      title: event.title,
      description: event.description ?? "",
      category: event.category,
      startsAt: instantToCampusInput(event.startsAt),
      endsAt: instantToCampusInput(event.endsAt),
      sourceUrl: event.sourceUrl ?? "",
      imageUrl: event.imageUrl ?? null,
      recurrence: event.recurrence,
    };
  }

  function syncLocationForm(event: EventData) {
    const primary =
      event.locations.find((location) => location.isPrimary) ??
      event.locations[0] ??
      null;
    if (!primary) {
      locationForm = {
        anchorType: "custom",
        buildingId: "",
        dormId: "",
        label: "",
      };
      return;
    }
    locationForm = {
      anchorType: primary.anchorType,
      buildingId: primary.buildingId ?? "",
      dormId: primary.dormId ?? "",
      label: primary.label,
    };
  }

  function flyMapToAnchorPreview(coords: { lat: number; lon: number }) {
    mapStore.mapInstance?.flyTo({
      center: [coords.lon, coords.lat],
      zoom: Math.max(mapStore.mapInstance.getZoom(), 17),
      duration: 700,
    });
  }

  function handleAnchorTypeChange() {
    locationForm.buildingId = "";
    locationForm.dormId = "";
  }

  function handleBuildingAnchorChange() {
    if (locationForm.buildingId === "") return;
    const building = buildings.find(
      (item) => item.id === Number(locationForm.buildingId),
    );
    if (!building) return;
    if (!locationForm.label.trim() || locationForm.label === "Event marker") {
      locationForm.label = building.buildingName;
    }
    if (building.lat != null && building.lon != null) {
      flyMapToAnchorPreview({ lat: building.lat, lon: building.lon });
    }
  }

  function handleDormAnchorChange() {
    if (locationForm.dormId === "") return;
    const dorm = dorms.find((item) => item.id === Number(locationForm.dormId));
    if (!dorm) return;
    if (!locationForm.label.trim() || locationForm.label === "Event marker") {
      locationForm.label = dorm.dormName;
    }
    if (dorm.lat != null && dorm.lon != null) {
      flyMapToAnchorPreview({ lat: dorm.lat, lon: dorm.lon });
    }
  }

  function focusMapOnSavedEvent(event: EventData) {
    const primary =
      event.locations.find((location) => location.isPrimary) ??
      event.locations[0] ??
      null;
    if (
      !primary ||
      primary.resolvedLat === null ||
      primary.resolvedLon === null
    ) {
      return;
    }
    flyMapToAnchorPreview({
      lat: primary.resolvedLat,
      lon: primary.resolvedLon,
    });
  }

  function applyConflictLatest(data: { latest?: EventData | null }) {
    if (!data.latest) return;
    appActions.replaceEvent(data.latest);
    form = eventToForm(data.latest);
    syncLocationForm(data.latest);
    routeForms = data.latest.routes.map((route) => ({
      id: route.id,
      name: route.name,
      description: route.description ?? "",
    }));
  }

  function serializeRoutesForSave(event: EventData) {
    return event.routes.map((route) => {
      const edited = routeForms.find((item) => item.id === route.id);
      return {
        id: route.id,
        name: edited?.name.trim() || route.name,
        description: edited?.description.trim() || route.description,
        sortOrder: route.sortOrder,
        stops: route.stops.map((stop) => ({
          id: stop.id,
          eventLocationId: stop.eventLocationId,
          label: stop.label,
          lat: stop.lat,
          lon: stop.lon,
          sortOrder: stop.sortOrder,
        })),
      };
    });
  }

  function buildPrimaryLocationPayload(event: EventData) {
    const primary =
      event.locations.find((location) => location.isPrimary) ??
      event.locations[0] ??
      null;
    const buildingId =
      locationForm.anchorType === "building" && locationForm.buildingId !== ""
        ? Number(locationForm.buildingId)
        : null;
    const dormId =
      locationForm.anchorType === "dorm" && locationForm.dormId !== ""
        ? Number(locationForm.dormId)
        : null;

    const nextPrimary = {
      anchorType: locationForm.anchorType,
      buildingId,
      dormId,
      label: locationForm.label.trim() || "Event marker",
      lat:
        locationForm.anchorType === "custom"
          ? (primary?.lat ?? primary?.resolvedLat ?? null)
          : null,
      lon:
        locationForm.anchorType === "custom"
          ? (primary?.lon ?? primary?.resolvedLon ?? null)
          : null,
      highlightPriority: primary?.highlightPriority ?? 0,
      sortOrder: primary?.sortOrder ?? 0,
      isPrimary: true,
      ...(primary?.id ? { id: primary.id } : {}),
    };

    if (!primary) return [nextPrimary];
    return event.locations.map((location) =>
      location.id === primary.id
        ? { ...serializeLocation(location), ...nextPrimary }
        : serializeLocation(location, { isPrimary: false }),
    );
  }

  async function saveEvent() {
    if (!event || saving) return;
    saving = true;
    try {
      const result = await persistEntityChange({
        entityType: "event",
        entityId: event.id,
        baseVersion: event.version,
        patch: {
          title: form.title,
          description: form.description || null,
          category: form.category,
          startsAt: campusInputToWallString(form.startsAt),
          endsAt: campusInputToWallString(form.endsAt),
          sourceUrl: form.sourceUrl || null,
          imageUrl: form.imageUrl,
          recurrence: form.recurrence,
          routes: serializeRoutesForSave(event),
        },
        entityLabel: form.title,
        canPublish,
        submitterName:
          adminAuthStore.displayName ??
          adminAuthStore.username ??
          submitterNameDraft,
        proposalId: activeProposalId,
      });

      if (!result.ok) {
        if (result.latest)
          applyConflictLatest({ latest: result.latest as EventData });
        throw new Error(result.error ?? "Save failed");
      }

      if (result.published) {
        const updated = result.published as EventData;
        appActions.replaceEvent(updated);
        queryStore.updateQuery({
          category: "event",
          type: "result",
          value: updated.title,
          eventSlug: updated.slug,
        });
        editing = false;
        toastStore.show(`${form.title} saved.`, "success");
      } else {
        clearEntityContributorDraft("event", event.id);
        toastStore.show(
          `Suggestion for ${form.title} submitted for review.`,
          "success",
        );
      }
    } catch (error) {
      toastStore.show(
        error instanceof Error ? error.message : "Failed to save event.",
        "error",
      );
    } finally {
      saving = false;
    }
  }

  async function savePrimaryLocationAnchor() {
    if (!event || savingLocation) return;
    savingLocation = true;
    try {
      const locations = buildPrimaryLocationPayload(event);
      const result = await persistEntityChange({
        entityType: "event_locations",
        entityId: event.id,
        baseVersion: event.version,
        patch: { locations },
        entityLabel: event.title,
        canPublish,
        submitterName:
          adminAuthStore.displayName ??
          adminAuthStore.username ??
          submitterNameDraft,
        proposalId: activeProposalId,
      });

      if (!result.ok) {
        if (result.latest)
          applyConflictLatest({ latest: result.latest as EventData });
        throw new Error(result.error ?? "Location save failed");
      }

      if (result.published) {
        const updated = result.published as EventData;
        appActions.replaceEvent(updated);
        syncLocationForm(updated);
        focusMapOnSavedEvent(updated);
        toastStore.show(`${updated.title} location updated.`, "success");
      } else {
        clearEntityContributorDraft("event", event.id);
        toastStore.show(
          `Location suggestion for ${event.title} submitted for review.`,
          "success",
        );
      }
    } catch (error) {
      toastStore.show(
        error instanceof Error
          ? error.message
          : `Failed to save location for ${event.title}.`,
        "error",
      );
    } finally {
      savingLocation = false;
    }
  }

  function enableEventPinProposal() {
    if (!event) return;
    mapProposalStore.enable(
      {
        type: "event",
        id: event.id,
        label: event.title,
        version: event.version,
      },
      submitterNameDraft,
      activeProposalId,
    );
    toastStore.show(
      `Drag the ${event.title} pin on the map, then release to submit.`,
      "info",
    );
  }

  async function deactivateEvent() {
    if (!event || deactivating) return;
    if (
      !window.confirm(
        `Deactivate "${event.title}"? It will be hidden from the public map and lists.`,
      )
    ) {
      return;
    }

    deactivating = true;
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version: event.version }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        latest?: EventData | null;
      };

      if (!res.ok) {
        if (res.status === 409 && data.latest) {
          applyConflictLatest(data);
        }
        throw new Error(data.error ?? `Deactivate failed (${res.status})`);
      }

      appActions.removeEvent(event.id);
      queryStore.clearQuery();
      toastStore.show(`${event.title} deactivated.`, "success");
    } catch (error) {
      toastStore.show(
        error instanceof Error
          ? error.message
          : `Failed to deactivate ${event.title}.`,
        "error",
      );
    } finally {
      deactivating = false;
    }
  }

  function getMapCenterCoords() {
    const center = mapStore.mapInstance?.getCenter();
    return {
      lat: center?.lat ?? CAMPUS_DEFAULT_CAMERA.center[1],
      lon: center?.lng ?? CAMPUS_DEFAULT_CAMERA.center[0],
    };
  }

  function serializeLocation(
    location: EventData["locations"][number],
    overrides: Partial<EventData["locations"][number]> = {},
  ) {
    return {
      id: location.id,
      anchorType: overrides.anchorType ?? location.anchorType,
      buildingId:
        overrides.buildingId !== undefined
          ? overrides.buildingId
          : location.buildingId,
      dormId:
        overrides.dormId !== undefined ? overrides.dormId : location.dormId,
      label: overrides.label ?? location.label,
      lat: overrides.lat !== undefined ? overrides.lat : location.lat,
      lon: overrides.lon !== undefined ? overrides.lon : location.lon,
      highlightPriority:
        overrides.highlightPriority ?? location.highlightPriority,
      sortOrder: overrides.sortOrder ?? location.sortOrder,
      isPrimary: overrides.isPrimary ?? location.isPrimary,
    };
  }

  function buildPrimaryLocationUpdate(
    event: EventData,
    coords: { lat: number; lon: number },
  ) {
    const primary =
      event.locations.find((location) => location.isPrimary) ??
      event.locations[0] ??
      null;

    if (!primary) {
      return [
        {
          anchorType: "custom" as const,
          buildingId: null,
          dormId: null,
          label: "Event marker",
          lat: coords.lat,
          lon: coords.lon,
          highlightPriority: 0,
          sortOrder: 0,
          isPrimary: true,
        },
      ];
    }

    return event.locations.map((location) =>
      location.id === primary.id
        ? serializeLocation(location, {
            anchorType: "custom",
            buildingId: null,
            dormId: null,
            label: location.label || "Event marker",
            lat: coords.lat,
            lon: coords.lon,
            isPrimary: true,
          })
        : serializeLocation(location, { isPrimary: false }),
    );
  }

  async function placePrimaryLocationAtMapCenter() {
    if (!event || savingLocation) return;
    savingLocation = true;
    try {
      const res = await fetch(`/api/admin/events/${event.id}/locations`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: event.version,
          locations: buildPrimaryLocationUpdate(event, getMapCenterCoords()),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        event?: EventData;
        latest?: EventData | null;
      };

      if (!res.ok || !data.event) {
        if (res.status === 409 && data.latest) {
          applyConflictLatest(data);
        }
        throw new Error(data.error ?? `Location save failed (${res.status})`);
      }

      appActions.replaceEvent(data.event);
      if (!mapEditStore.enabled) mapEditStore.toggle();
      toastStore.show(
        `${data.event.title} marker placed. Drag it on the map to adjust.`,
        "success",
      );
    } catch (error) {
      toastStore.show(
        error instanceof Error
          ? error.message
          : "Failed to place event marker.",
        "error",
      );
    } finally {
      savingLocation = false;
    }
  }
</script>

<div class="event-result">
  {#if event}
    <header class="entity-header event-header">
      <div class="entity-panel-header-top">
        <EntityPanelClose
          ariaLabel="Close event details"
          title="Close event details (Esc)"
          onclick={closeEventDetails}
        />
        <div class="entity-header__title-row">
          <h2 class="entity-header__title">{event.title}</h2>
          <span
            class="entity-header__badge"
            class:entity-header__badge--muted={event.status === "past"}
          >
            {STATUS_LABELS[event.status]}
          </span>
        </div>
      </div>
      {#if event.description}
        <p>{event.description}</p>
      {/if}
      {#if eventImage}
        <img
          class="event-image"
          src={eventImage.src}
          alt={eventImage.alt}
          width="800"
          height="450"
          loading="lazy"
          decoding="async"
        />
      {/if}
      <div class="entity-actions">
        {#if primaryLocation && primaryLocation.resolvedLon !== null && primaryLocation.resolvedLat !== null}
          <EntityDirectionsChip
            lat={primaryLocation.resolvedLat}
            lon={primaryLocation.resolvedLon}
            destinationLabel={primaryLocation.resolvedLabel}
          />
        {/if}
        <EntityShareCopyLink url={shareUrl} entityLabel={event.title} />
        <EntityEditorToggle
          expanded={editing}
          {canPublish}
          publishOpenLabel="Edit event"
          suggestOpenLabel="Suggest changes"
          variant="toolbar"
          onclick={() => (editing = !editing)}
        />
      </div>
      <EntityLastUpdated
        updatedAt={event.updatedAt}
        entityType="event"
        entityId={event.id}
      />
    </header>

    <section class="event-section">
      <h3>When</h3>
      <p>
        {formatCampusDateTime(event.occurrenceStartsAt)} to {formatCampusDateTime(
          event.occurrenceEndsAt,
        )}
      </p>
      <p class="muted timezone-note">Times shown in campus time (Manila).</p>
    </section>

    {#if event.locations.length > 0}
      <section class="event-section">
        <h3>Event locations</h3>
        <ul>
          {#each event.locations as location (location.id)}
            <li>
              <MapPin size={15} aria-hidden="true" />
              <span>{location.resolvedLabel}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if event.routes.length > 0}
      <section class="event-section">
        <h3>
          {event.routes.length === 1 ? "Suggested route" : "Suggested routes"}
        </h3>
        <p class="muted">Optional path details for this event.</p>
        {#each event.routes as route (route.id)}
          <div class="route-card">
            <strong><Route size={15} aria-hidden="true" /> {route.name}</strong>
            {#if route.description}
              <p>{route.description}</p>
            {/if}
            <ol>
              {#each route.stops as stop (stop.id)}
                <li>{stop.resolvedLabel}</li>
              {/each}
            </ol>
          </div>
        {/each}
      </section>
    {/if}

    {#if event.sourceUrl}
      <a
        class="source-link"
        href={event.sourceUrl}
        target="_blank"
        rel="noreferrer"
      >
        <span>Source</span>
        <ExternalLink size={15} aria-hidden="true" />
      </a>
    {/if}

    {#if editing}
      <section
        class="event-admin entity-editor"
        aria-label={canPublish ? "Edit event details" : "Suggest event changes"}
      >
        <EntityEditorPanel
          {canPublish}
          showSubmitterName={!canPublish && !adminAuthStore.isLoggedIn}
          submitterNameId="event-submitter-name"
          historyEntity={event ? { entityType: "event", entityId: event.id, version: event.version } : null}
          bind:submitterName={submitterNameDraft}
        >
          <form
            class="entity-editor-form"
            onsubmit={(e) => {
              e.preventDefault();
              saveEvent();
            }}
          >
            <EntityEditorFormField label="Title" inputId="event-title-editor">
              {#snippet control()}
                <input
                  id="event-title-editor"
                  bind:value={form.title}
                  required
                />
              {/snippet}
            </EntityEditorFormField>
            <EntityEditorFormField
              label="Description"
              inputId="event-description-editor"
            >
              {#snippet control()}
                <textarea
                  id="event-description-editor"
                  bind:value={form.description}></textarea>
              {/snippet}
            </EntityEditorFormField>
            <EntityEditorFormField
              label="Category"
              inputId="event-category-editor"
            >
              {#snippet control()}
                <select id="event-category-editor" bind:value={form.category}>
                  <option value="tradition">Tradition</option>
                  <option value="fair">Fair</option>
                  <option value="ceremony">Ceremony</option>
                  <option value="sports">Sports</option>
                  <option value="other">Other</option>
                </select>
              {/snippet}
            </EntityEditorFormField>
            <p class="entity-editor-muted timezone-note">
              Enter start and end in campus time (Manila).
            </p>
            <EntityEditorFormField label="Starts" inputId="event-starts-editor">
              {#snippet control()}
                <input
                  id="event-starts-editor"
                  type="datetime-local"
                  bind:value={form.startsAt}
                  required
                />
              {/snippet}
            </EntityEditorFormField>
            <EntityEditorFormField label="Ends" inputId="event-ends-editor">
              {#snippet control()}
                <input
                  id="event-ends-editor"
                  type="datetime-local"
                  bind:value={form.endsAt}
                  required
                />
              {/snippet}
            </EntityEditorFormField>
            <EntityEditorFormField
              label="Source URL"
              inputId="event-source-editor"
            >
              {#snippet control()}
                <input id="event-source-editor" bind:value={form.sourceUrl} />
              {/snippet}
            </EntityEditorFormField>
            <ImageUpload
              inputId="event-image-editor"
              prefix={`events/${event.slug}`}
              bind:value={form.imageUrl}
              disabled={saving}
            />
            <EntityEditorFormField
              label="Recurrence"
              inputId="event-recurrence-editor"
            >
              {#snippet control()}
                <select
                  id="event-recurrence-editor"
                  bind:value={form.recurrence}
                >
                  <option value="none">None</option>
                  <option value="annual">Annual</option>
                  <option value="every_1st_sem">Every 1st semester</option>
                  <option value="every_2nd_sem">Every 2nd semester</option>
                </select>
              {/snippet}
            </EntityEditorFormField>
            {#if routeForms.length > 0}
              <EntityEditorCard title="Routes">
                {#each routeForms as routeForm, index (routeForm.id)}
                  <EntityEditorFormField
                    label="Route name"
                    inputId="event-route-name-{routeForm.id}"
                  >
                    {#snippet control()}
                      <input
                        id="event-route-name-{routeForm.id}"
                        bind:value={routeForms[index]!.name}
                        required
                      />
                    {/snippet}
                  </EntityEditorFormField>
                  <EntityEditorFormField
                    label="Route description"
                    inputId="event-route-desc-{routeForm.id}"
                  >
                    {#snippet control()}
                      <textarea
                        id="event-route-desc-{routeForm.id}"
                        bind:value={routeForms[index]!.description}></textarea>
                    {/snippet}
                  </EntityEditorFormField>
                {/each}
              </EntityEditorCard>
            {/if}
            <EntityEditorCard title="Primary location anchor">
              <p>
                Choose whether the primary marker follows a building, dorm, or
                custom map coordinates.
              </p>
              <EntityEditorFormField
                label="Anchor type"
                inputId="event-anchor-type-editor"
              >
                {#snippet control()}
                  <select
                    id="event-anchor-type-editor"
                    bind:value={locationForm.anchorType}
                    onchange={handleAnchorTypeChange}
                  >
                    <option value="custom">Custom map point</option>
                    <option value="building">Building</option>
                    <option value="dorm">Dorm</option>
                  </select>
                {/snippet}
              </EntityEditorFormField>
              {#if locationForm.anchorType === "building"}
                <EntityEditorFormField
                  label="Building"
                  inputId="event-building-anchor-editor"
                >
                  {#snippet control()}
                    <select
                      id="event-building-anchor-editor"
                      bind:value={locationForm.buildingId}
                      required
                      onchange={handleBuildingAnchorChange}
                    >
                      <option value="">Select a building</option>
                      {#each buildings as building (building.id)}
                        <option value={building.id}
                          >{building.buildingName}</option
                        >
                      {/each}
                    </select>
                  {/snippet}
                </EntityEditorFormField>
              {:else if locationForm.anchorType === "dorm"}
                <EntityEditorFormField
                  label="Dorm"
                  inputId="event-dorm-anchor-editor"
                >
                  {#snippet control()}
                    <select
                      id="event-dorm-anchor-editor"
                      bind:value={locationForm.dormId}
                      required
                      onchange={handleDormAnchorChange}
                    >
                      <option value="">Select a dorm</option>
                      {#each dorms as dorm (dorm.id)}
                        <option value={dorm.id}>{dorm.dormName}</option>
                      {/each}
                    </select>
                  {/snippet}
                </EntityEditorFormField>
              {/if}
              <EntityEditorFormField
                label="Location label"
                inputId="event-location-label-editor"
              >
                {#snippet control()}
                  <input
                    id="event-location-label-editor"
                    bind:value={locationForm.label}
                  />
                {/snippet}
              </EntityEditorFormField>
              <div class="entity-editor-form-actions">
                <EntityEditorSubmitButton
                  variant="secondary"
                  saving={savingLocation}
                  label={canPublish
                    ? "Save location anchor"
                    : "Submit location"}
                  savingLabel={canPublish
                    ? "Saving anchor..."
                    : "Submitting..."}
                  onclick={savePrimaryLocationAnchor}
                />
              </div>
            </EntityEditorCard>
            <EntityEditorCard title="Event location">
              {#if primaryLocation && primaryLocation.resolvedLat !== null && primaryLocation.resolvedLon !== null}
                <p>
                  {#if canPublish}
                    Drag the event marker on the map to move it. This edits the
                    primary location only.
                  {:else if mapProposalStore.allowsKey(`event:${event.id}:location`)}
                    Pin move mode is on. Drag the event marker on the map.
                  {:else}
                    Suggest a map pin move, then drag the marker.
                    <EntityEditorPinRow
                      label="Event marker"
                      pickLabel="Enable pin move"
                      onclick={enableEventPinProposal}
                    />
                  {/if}
                </p>
              {:else}
                <p>
                  Place a primary marker at the current map center, then drag it
                  on the map to refine the location.
                </p>
              {/if}
              <div class="entity-editor-form-actions">
                {#if canPublish}
                  <EntityEditorSubmitButton
                    variant="secondary"
                    label={mapEditStore.enabled
                      ? "Map editing on"
                      : "Enable map editing"}
                    onclick={() => {
                      if (!mapEditStore.enabled) mapEditStore.toggle();
                    }}
                  />
                  {#if !primaryLocation || primaryLocation.resolvedLat === null || primaryLocation.resolvedLon === null}
                    <EntityEditorSubmitButton
                      variant="primary"
                      saving={savingLocation}
                      label="Place marker at map center"
                      savingLabel="Placing..."
                      onclick={placePrimaryLocationAtMapCenter}
                    />
                  {/if}
                {/if}
              </div>
            </EntityEditorCard>
            <EntityEditorSubmitButton
              type="submit"
              variant="primary"
              {saving}
              label={canPublish ? "Save event" : "Send suggestion"}
              savingLabel={fieldSaveActionLabel({
                canPublish,
                isSaving: true,
              })}
            />
            {#if canPublish}
              <EntityEditorSubmitButton
                variant="danger"
                saving={deactivating}
                label="Deactivate event"
                savingLabel="Deactivating..."
                onclick={deactivateEvent}
              />
            {/if}
          </form>
        </EntityEditorPanel>
      </section>
    {/if}
  {:else}
    <p><LoadingIndicator label="Loading event…" /></p>
  {/if}
</div>

<style>
  @import "./entity-detail.css";
  @import "../editor/entity-editor.css";

  .event-result {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    gap: 0.85rem;
    overflow-y: auto;
    width: 100%;
  }

  .event-header,
  .event-section,
  .event-admin,
  .route-card {
    display: grid;
    gap: 0.45rem;
  }

  .event-section li,
  .route-card strong {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .timezone-note {
    font-size: 0.75rem;
  }

  .event-image {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 0.75rem;
    box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.12);
  }

  .event-header .entity-panel-header-top :global(.entity-panel-close) {
    order: 2;
    margin-left: auto;
  }

  .event-header .entity-header__title-row {
    order: 1;
    flex: 1 1 auto;
    min-width: 0;
  }

  h3,
  p {
    margin: 0;
  }

  h3 {
    color: #7b1113;
    font-size: 0.85rem;
  }

  p,
  li,
  label,
  .source-link {
    color: #3f3f46;
    font-size: 0.85rem;
    line-height: 1.45;
  }

  .muted {
    color: #71717a;
  }

  ul,
  ol {
    display: grid;
    gap: 0.35rem;
    margin: 0;
    padding-left: 1rem;
  }

  .source-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    width: max-content;
    padding: 0.35rem 0.65rem;
    border: 1px solid #d8b9ba;
    border-radius: 999px;
    background: #fffafa;
    color: #7b1113;
    font-weight: 700;
    text-decoration: none;
  }

  .source-link:hover,
  .source-link:focus-visible {
    background: #fdf3f3;
  }

  .source-link:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: -2px; /* panel scroll body clips outward rings */
  }
</style>
