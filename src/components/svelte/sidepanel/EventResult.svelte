<script lang="ts">
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import CornerRightUp from "@lucide/svelte/icons/corner-right-up";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Route from "@lucide/svelte/icons/route";
  import CopyLinkButton from "../CopyLinkButton.svelte";
  import { getAppActions, getAppData } from "../../../lib/context";
  import {
    campusInputToWallString,
    formatCampusDateTime,
    instantToCampusInput,
  } from "../../../lib/event-time";
  import {
    adminAuthStore,
    locationStore,
    queryStore,
    toastStore,
  } from "../../../lib/store.svelte";
  import { getEventShareUrl } from "../../../lib/share-links";
  import type { EventData } from "../../../lib/types";

  const appData = getAppData();
  const appActions = getAppActions();
  const { events, loaded } = $derived(appData());
  const event = $derived(
    loaded
      ? (events.find((item) => item.title === queryStore.queryValue) ?? null)
      : null,
  );
  const shareUrl = $derived(event ? getEventShareUrl(event.slug) : "");
  const primaryLocation = $derived(
    event
      ? (event.locations.find((location) => location.isPrimary) ??
          event.locations[0] ??
          null)
      : null,
  );

  let editing = $state(false);
  let saving = $state(false);
  let form = $state({
    title: "",
    description: "",
    category: "other",
    startsAt: "",
    endsAt: "",
    recurrence: "none",
    sourceUrl: "",
    includeInSeo: false,
    locationsJson: "[]",
    routesJson: "[]",
  });

  $effect(() => {
    if (!event || editing) return;
    form = eventToForm(event);
  });

  function eventToForm(event: EventData) {
    return {
      title: event.title,
      description: event.description ?? "",
      category: event.category,
      startsAt: instantToCampusInput(event.occurrenceStartsAt),
      endsAt: instantToCampusInput(event.occurrenceEndsAt),
      recurrence: event.recurrence,
      sourceUrl: event.sourceUrl ?? "",
      includeInSeo: event.includeInSeo,
      locationsJson: JSON.stringify(event.locations, null, 2),
      routesJson: JSON.stringify(event.routes, null, 2),
    };
  }

  function formatDate(value: string) {
    return formatCampusDateTime(value);
  }

  async function saveEvent() {
    if (!event || saving) return;
    saving = true;
    try {
      const locations = JSON.parse(form.locationsJson);
      const routes = JSON.parse(form.routesJson);
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
          recurrence: form.recurrence,
          sourceUrl: form.sourceUrl || null,
          includeInSeo: form.includeInSeo,
          locations,
          routes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status})`);

      if (data.event) appActions.replaceEvent(data.event);
      queryStore.updateQuery({
        category: "event",
        type: "result",
        value: data.event?.title ?? form.title,
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
</script>

<div class="event-result">
  {#if event}
    <header class="event-header">
      <div class="event-kicker">
        <CalendarDays size={16} />
        <span>{event.status === "active" ? "Active event" : event.status}</span>
      </div>
      <h2>{event.title}</h2>
      {#if event.description}
        <p>{event.description}</p>
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
        {formatDate(event.occurrenceStartsAt)} to {formatDate(
          event.occurrenceEndsAt,
        )}
      </p>
      {#if event.recurrence !== "none"}
        <p class="muted">Repeats: {event.recurrence.replaceAll("_", " ")}</p>
      {/if}
    </section>

    {#if event.locations.length > 0}
      <section class="event-section">
        <h3>Map markers</h3>
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
        <h3>Routes</h3>
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
        Source
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
            <label>
              Recurrence
              <select bind:value={form.recurrence}>
                <option value="none">None</option>
                <option value="annual">Annual</option>
                <option value="every_1st_sem">Every 1st sem</option>
                <option value="every_2nd_sem">Every 2nd sem</option>
              </select>
            </label>
            <label>Source URL <input bind:value={form.sourceUrl} /></label>
            <label class="checkbox">
              <input type="checkbox" bind:checked={form.includeInSeo} />
              Include in SEO pages
            </label>
            <label
              >Locations JSON <textarea bind:value={form.locationsJson}
              ></textarea></label
            >
            <label
              >Routes JSON <textarea bind:value={form.routesJson}
              ></textarea></label
            >
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
    color: #7b1113;
    font-weight: 700;
    text-decoration: none;
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

  .checkbox {
    display: flex;
    align-items: center;
    gap: 0.4rem;
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
