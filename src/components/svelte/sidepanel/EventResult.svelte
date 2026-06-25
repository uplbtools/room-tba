<script lang="ts">
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import CornerRightUp from "@lucide/svelte/icons/corner-right-up";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Route from "@lucide/svelte/icons/route";
  import CopyLinkButton from "../CopyLinkButton.svelte";
  import { getAppActions, getAppData } from "../../../lib/context";
  import {
    adminAuthStore,
    eventPlacementStore,
    locationStore,
    mapEditStore,
    mapStore,
    queryStore,
    toastStore,
  } from "../../../lib/store.svelte";
  import { CAMPUS_DEFAULT_CAMERA } from "../../../constants/map-terrain";
  import { getEventImage } from "../../../lib/event-images";
  import {
    campusInputToWallString,
    formatCampusDateTime,
    instantToCampusInput,
  } from "../../../lib/event-time";
  import { getEventShareUrl } from "../../../lib/share-links";
  import type { EventData } from "../../../lib/types";

  const STATUS_LABELS: Record<EventData["status"], string> = {
    active: "Happening now",
    upcoming: "Upcoming event",
    past: "Past event",
  };

  const appData = getAppData();
  const appActions = getAppActions();
  const { events, loaded } = $derived(appData());
  const event = $derived(
    loaded
      ? queryStore.selectedEventSlug
        ? (events.find((item) => item.slug === queryStore.selectedEventSlug) ??
          null)
        : (events.find((item) => item.title === queryStore.queryValue) ?? null)
      : null,
  );
  const shareUrl = $derived(event ? getEventShareUrl(event.slug) : "");
  const eventImage = $derived(event ? getEventImage(event.slug) : null);
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
  let form = $state({
    title: "",
    description: "",
    category: "other",
    startsAt: "",
    endsAt: "",
    sourceUrl: "",
  });

  $effect(() => {
    if (!event || editing) return;
    form = eventToForm(event);
  });

  $effect(() => {
    if (!event || !eventPlacementStore.consumeCreatedEvent(event.id)) return;
    form = eventToForm(event);
    editing = true;
  });

  function eventToForm(event: EventData) {
    return {
      title: event.title,
      description: event.description ?? "",
      category: event.category,
      startsAt: instantToCampusInput(event.occurrenceStartsAt),
      endsAt: instantToCampusInput(event.occurrenceEndsAt),
      sourceUrl: event.sourceUrl ?? "",
    };
  }

  async function saveEvent() {
    if (!event || saving) return;
    saving = true;
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: event.version,
          title: form.title,
          description: form.description || null,
          category: form.category,
          startsAt: campusInputToWallString(form.startsAt),
          endsAt: campusInputToWallString(form.endsAt),
          sourceUrl: form.sourceUrl || null,
          includeInSeo: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status})`);

      if (data.event) appActions.replaceEvent(data.event);
      queryStore.updateQuery({
        category: "event",
        type: "result",
        value: data.event?.title ?? form.title,
        eventSlug: data.event?.slug ?? event.slug,
      });
      editing = false;
      toastStore.show(`${form.title} saved.`, "success");
    } catch (error) {
      toastStore.show(
        error instanceof Error ? error.message : "Failed to save event.",
        "error",
      );
    } finally {
      saving = false;
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
          appActions.replaceEvent(data.latest);
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
    <header class="event-header">
      <div class="event-kicker" class:is-past={event.status === "past"}>
        <CalendarDays size={16} />
        <span>{STATUS_LABELS[event.status]}</span>
      </div>
      <h2>{event.title}</h2>
      {#if event.description}
        <p>{event.description}</p>
      {/if}
      {#if eventImage}
        <img
          class="event-image"
          src={eventImage.src}
          alt={eventImage.alt}
          loading="lazy"
        />
      {/if}
      <div class="event-actions">
        {#if primaryLocation && primaryLocation.resolvedLon !== null && primaryLocation.resolvedLat !== null}
          <button
            class="primary-action"
            onclick={() => {
              if (!primaryLocation) return;
              locationStore.requestLocation();
              locationStore.setDestination([
                primaryLocation.resolvedLon ?? 0,
                primaryLocation.resolvedLat ?? 0,
              ]);
            }}
          >
            Get directions
            <CornerRightUp size={18} />
          </button>
        {/if}
        <CopyLinkButton
          url={shareUrl}
          ariaLabel={`Copy link to ${event.title}`}
          successMessage={`Copied link for ${event.title}.`}
          errorMessage={`Could not copy link for ${event.title}.`}
          feedback="none"
          variant="chip"
          onsuccess={() =>
            toastStore.show(`Copied link for ${event.title}.`, "success")}
          onerror={() =>
            toastStore.show(`Could not copy link for ${event.title}.`, "error")}
        />
      </div>
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
              <MapPin size={15} />
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
            <strong><Route size={15} /> {route.name}</strong>
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

    {#if adminAuthStore.isAdmin}
      <section class="event-admin">
        <button class="secondary-action" onclick={() => (editing = !editing)}>
          {editing ? "Close editor" : "Edit event"}
        </button>
        {#if editing}
          <form
            class="event-form"
            onsubmit={(e) => {
              e.preventDefault();
              saveEvent();
            }}
          >
            <label>Title <input bind:value={form.title} required /></label>
            <label
              >Description <textarea bind:value={form.description}
              ></textarea></label
            >
            <label>
              Category
              <select bind:value={form.category}>
                <option value="tradition">Tradition</option>
                <option value="fair">Fair</option>
                <option value="ceremony">Ceremony</option>
                <option value="sports">Sports</option>
                <option value="other">Other</option>
              </select>
            </label>
            <p class="muted timezone-note">
              Enter start and end in campus time (Manila).
            </p>
            <label
              >Starts <input
                type="datetime-local"
                bind:value={form.startsAt}
                required
              /></label
            >
            <label
              >Ends <input
                type="datetime-local"
                bind:value={form.endsAt}
                required
              /></label
            >
            <label>Source URL <input bind:value={form.sourceUrl} /></label>
            <div class="location-editor-card">
              <div>
                <strong>Event location</strong>
                {#if primaryLocation && primaryLocation.resolvedLat !== null && primaryLocation.resolvedLon !== null}
                  <p>
                    Drag the event marker on the map to move it. This edits the
                    primary location only.
                  </p>
                {:else}
                  <p>
                    Place a primary marker at the current map center, then drag
                    it on the map to refine the location.
                  </p>
                {/if}
              </div>
              <div class="location-editor-actions">
                <button
                  class="secondary-action"
                  type="button"
                  onclick={() => {
                    if (!mapEditStore.enabled) mapEditStore.toggle();
                  }}
                >
                  {mapEditStore.enabled
                    ? "Map editing on"
                    : "Enable map editing"}
                </button>
                {#if !primaryLocation || primaryLocation.resolvedLat === null || primaryLocation.resolvedLon === null}
                  <button
                    class="primary-action"
                    type="button"
                    disabled={savingLocation}
                    onclick={placePrimaryLocationAtMapCenter}
                  >
                    {savingLocation
                      ? "Placing..."
                      : "Place marker at map center"}
                  </button>
                {/if}
              </div>
            </div>
            <button class="primary-action" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save event"}
            </button>
          </form>
        {/if}
      </section>
    {/if}
  {:else}
    <p>Loading event...</p>
  {/if}
</div>

<style>
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

  .event-kicker,
  .event-section li,
  .route-card strong {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .event-kicker {
    color: #7b1113;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .event-kicker.is-past {
    color: #71717a;
  }

  .timezone-note {
    font-size: 0.75rem;
  }

  .event-image {
    display: block;
    width: 100%;
    max-height: 24rem;
    border-radius: 0.75rem;
    object-fit: cover;
    object-position: top center;
    box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.12);
  }

  h2,
  h3,
  p {
    margin: 0;
  }

  h2 {
    color: #18181b;
    font-size: 1.125rem;
    line-height: 1.25;
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

  .event-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .primary-action,
  .secondary-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    width: max-content;
    border-radius: 0.5rem;
    cursor: pointer;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 700;
    padding: 0.375rem 0.75rem;
  }

  .primary-action {
    border: none;
    background: #7b1113;
    color: white;
  }

  .secondary-action {
    border: 1px solid #d8b9ba;
    background: white;
    color: #7b1113;
  }

  .primary-action:disabled {
    cursor: progress;
    opacity: 0.65;
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
    outline-offset: 2px;
  }

  .event-form {
    display: grid;
    gap: 0.55rem;
  }

  label {
    display: grid;
    gap: 0.25rem;
    font-weight: 700;
  }

  .location-editor-card {
    display: grid;
    gap: 0.55rem;
    padding: 0.65rem;
    border: 1px solid #d8b9ba;
    border-radius: 0.75rem;
    background: #fffafa;
  }

  .location-editor-card strong {
    color: #7b1113;
    font-size: 0.85rem;
  }

  .location-editor-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid #d8b9ba;
    border-radius: 0.5rem;
    font: inherit;
    padding: 0.45rem 0.55rem;
  }

  textarea {
    min-height: 5.5rem;
    resize: vertical;
  }
</style>
