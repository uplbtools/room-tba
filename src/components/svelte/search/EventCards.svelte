<script lang="ts">
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import CalendarPlus from "@lucide/svelte/icons/calendar-plus";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import CopyLinkButton from "../CopyLinkButton.svelte";
  import { getAppData } from "../../../lib/context";
  import { getEventImage } from "../../../lib/event-images";
  import {
    formatCampusDateShort,
    formatCampusTime,
    instantToCampusWallString,
  } from "../../../lib/event-time";
  import { getEventShareUrl } from "../../../lib/share-links";
  import {
    adminAuthStore,
    eventPlacementStore,
    queryStore,
    sidePanelStore,
    toastStore,
  } from "../../../lib/store.svelte";
  import type { EventData } from "../../../lib/types";

  let {
    headingId = "events-heading",
    showHeading = true,
    showRetract = false,
    oncollapse,
  }: {
    headingId?: string;
    showHeading?: boolean;
    showRetract?: boolean;
    oncollapse?: () => void;
  } = $props();

  const appData = getAppData();
  const { events, loaded } = $derived(appData());
  const campusEvents = $derived.by(() => {
    if (!loaded) return [];
    return events
      .filter(
        (event) => event.status === "active" || event.status === "upcoming",
      )
      .sort((a, b) => a.occurrenceStartsAt.localeCompare(b.occurrenceStartsAt));
  });
  const visibleEvents = $derived(campusEvents.slice(0, 4));
  const hasPastEvents = $derived(
    loaded && events.some((event) => event.status === "past"),
  );
  // Surface "View all" whenever there are events the inline list does not show,
  // including past events that only live in the full list.
  const hasHiddenEvents = $derived(
    campusEvents.length > visibleEvents.length || hasPastEvents,
  );
  const hasAnyEvents = $derived(loaded && events.length > 0);
  const placingEvent = $derived(
    eventPlacementStore.active || eventPlacementStore.creating,
  );

  function formatEventDate(value: string) {
    return `${formatCampusDateShort(value)}, ${formatCampusTime(value)}`;
  }

  function openEvent(event: EventData) {
    queryStore.updateQuery({
      category: "event",
      type: "result",
      value: event.title,
      eventSlug: event.slug,
    });
    queryStore.inputValue = event.title;
  }

  function openEventsList() {
    queryStore.updateQuery({
      category: "events",
      type: "result",
      value: "Campus events",
    });
    queryStore.inputValue = "Campus events";
    sidePanelStore.expand();
  }

  function startEventPlacement() {
    if (placingEvent) return;
    const now = Date.now();
    const startsAt = new Date(now + 60 * 60 * 1000);
    const endsAt = new Date(now + 2 * 60 * 60 * 1000);
    const titleDate = formatEventDate(startsAt.toISOString());
    const title = `Untitled campus event ${titleDate}`;
    eventPlacementStore.start({
      slug: `draft-event-${now}`,
      title,
      startsAt: instantToCampusWallString(startsAt),
      endsAt: instantToCampusWallString(endsAt),
      category: "other",
    });
    oncollapse?.();
  }
</script>

{#if !loaded}
  <section class="events-section" aria-labelledby={headingId}>
    <div class="section-heading">
      <h2 id={headingId} class="events-heading">Campus events</h2>
    </div>
    <p class="loading-events">Loading campus events…</p>
    <div class="event-skeleton-list" aria-hidden="true">
      {#each [1, 2] as row (row)}
        <div class="event-skeleton-row"></div>
      {/each}
    </div>
  </section>
{:else}
  <section class="events-section" aria-labelledby={headingId}>
    {#if showHeading}
      <div class="section-heading">
        <h2 id={headingId} class="events-heading">Campus events</h2>
        <span class="section-actions">
          {#if adminAuthStore.isAdmin}
            <button
              class="event-action-chip add-event-button"
              type="button"
              disabled={placingEvent}
              onclick={startEventPlacement}
            >
              <CalendarPlus size={14} aria-hidden="true" />
              <span>
                {#if eventPlacementStore.creating}
                  Creating...
                {:else if eventPlacementStore.active}
                  Choose on map
                {:else}
                  Add event
                {/if}
              </span>
            </button>
          {/if}
          {#if hasAnyEvents || hasHiddenEvents}
            <button
              class="event-action-chip view-all-button"
              type="button"
              onclick={openEventsList}
            >
              <CalendarDays size={14} aria-hidden="true" />
              <span>View all</span>
            </button>
          {/if}
          {#if showRetract && oncollapse}
            <button
              class="events-shelf-retract"
              type="button"
              aria-label="Collapse campus events"
              title="Collapse campus events"
              onclick={oncollapse}
            >
              <ChevronUp size={18} aria-hidden="true" />
            </button>
          {/if}
        </span>
      </div>
    {:else}
      <div class="section-actions section-actions--inline">
        {#if adminAuthStore.isAdmin}
          <button
            class="event-action-chip add-event-button"
            type="button"
            disabled={placingEvent}
            onclick={startEventPlacement}
          >
            <CalendarPlus size={14} aria-hidden="true" />
            <span>
              {#if eventPlacementStore.creating}
                Creating...
              {:else if eventPlacementStore.active}
                Choose on map
              {:else}
                Add event
              {/if}
            </span>
          </button>
        {/if}
        {#if hasAnyEvents || hasHiddenEvents}
          <button
            class="event-action-chip view-all-button"
            type="button"
            onclick={openEventsList}
          >
            <CalendarDays size={14} aria-hidden="true" />
            <span>View all</span>
          </button>
        {/if}
      </div>
    {/if}
    {#if visibleEvents.length > 0}
      <div class="event-list">
        {#each visibleEvents as event (event.id)}
          {@const image = getEventImage(event.slug)}
          {@const primaryLocation =
            event.locations.find((location) => location.isPrimary) ??
            event.locations[0] ??
            null}
          {@const shareUrl = getEventShareUrl(event.slug)}
          <div class="event-card">
            <button
              class="event-card-main"
              type="button"
              onclick={() => openEvent(event)}
            >
              {#if image}
                <img class="event-card-image" src={image.src} alt="" />
              {:else}
                <span class="event-card-icon" aria-hidden="true">Event</span>
              {/if}
              <span class="event-card-copy">
                <span class="event-card-title">{event.title}</span>
                <span class="event-card-meta">
                  {formatEventDate(event.occurrenceStartsAt)}
                  {#if primaryLocation}
                    - {primaryLocation.resolvedLabel}
                  {/if}
                </span>
                <span class="event-card-action">Open on map</span>
              </span>
            </button>
            <span class="event-card-copy-link">
              <CopyLinkButton
                url={shareUrl}
                label="Copy"
                ariaLabel={`Copy link to ${event.title}`}
                successMessage={`Copied link for ${event.title}.`}
                errorMessage={`Could not copy link for ${event.title}.`}
                feedback="none"
                variant="index"
                onsuccess={() =>
                  toastStore.show(`Copied link for ${event.title}.`, "success")}
                onerror={() =>
                  toastStore.show(
                    `Could not copy link for ${event.title}.`,
                    "error",
                  )}
              />
            </span>
          </div>
        {/each}
      </div>
    {:else if hasPastEvents}
      <p class="empty-events">
        No active or upcoming events right now. Use “View all” to browse past
        events.
      </p>
    {:else if adminAuthStore.isAdmin}
      <p class="empty-events">
        No campus events yet. Add an event, then choose its location on the map.
      </p>
    {:else}
      <p class="empty-events">
        No campus events scheduled yet. Browse events to check for updates.
      </p>
      <button
        class="event-action-chip browse-events-button"
        type="button"
        onclick={openEventsList}
      >
        <CalendarDays size={14} aria-hidden="true" />
        <span>Browse campus events</span>
      </button>
    {/if}
  </section>
{/if}

<style>
  .events-section {
    display: grid;
    gap: 0.5rem;
  }
  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem 0.75rem;
  }
  .section-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1 1 auto;
    min-width: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .events-shelf-retract {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid #d8b9ba;
    border-radius: 0.625rem;
    background: #fffafa;
    color: #7b1113;
    cursor: pointer;
    transition:
      background-color 0.16s,
      border-color 0.16s;
  }

  .events-shelf-retract:hover,
  .events-shelf-retract:focus-visible {
    border-color: #c58f91;
    background: #fdf3f3;
  }

  .events-shelf-retract:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }

  .section-actions--inline {
    flex: 0 0 auto;
    justify-content: flex-start;
  }
  .events-heading {
    margin: 0;
    font-size: 1rem;
  }
  .event-action-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    min-height: 2rem;
    padding: 0.375rem 0.875rem;
    white-space: nowrap;
    border: 1px solid #d8b9ba;
    border-radius: 0.75rem;
    background: #fffafa;
    color: #7b1113;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1;
    text-decoration: none;
    transition:
      background-color 0.16s,
      border-color 0.16s,
      color 0.16s,
      opacity 0.16s;
  }
  button.event-action-chip {
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .add-event-button:hover:not(:disabled),
  .add-event-button:focus-visible,
  .view-all-button:hover,
  .view-all-button:focus-visible,
  .browse-events-button:hover,
  .browse-events-button:focus-visible {
    border-color: #d8b9ba;
    background: #fdf3f3;
  }
  .add-event-button:disabled {
    cursor: progress;
    opacity: 0.65;
  }
  .event-action-chip:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }
  .event-list {
    display: grid;
    gap: 0.5rem;
  }
  .empty-events {
    margin: 0;
    color: #71717a;
    font-size: 0.8125rem;
    line-height: 1.35;
  }
  .loading-events {
    margin: 0;
    color: #71717a;
    font-size: 0.8125rem;
    line-height: 1.35;
  }
  .event-skeleton-list {
    display: grid;
    gap: 0.5rem;
  }
  .event-skeleton-row {
    height: 4.5rem;
    border-radius: 0.875rem;
    background: linear-gradient(90deg, #f4f4f5 25%, #ececee 50%, #f4f4f5 75%);
    background-size: 200% 100%;
  }
  .event-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem;
    border: 1px solid #eee1e1;
    border-radius: 0.875rem;
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }
  .event-card:hover,
  .event-card:focus-within {
    background-color: #fdf3f3;
    border-color: #d8b9ba;
  }
  .event-card:focus-within {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }
  .event-card-main {
    all: unset;
    display: grid;
    grid-template-columns: 3.5rem minmax(0, 1fr);
    align-items: center;
    min-width: 0;
    gap: 0.65rem;
    cursor: pointer;
  }
  .event-card-main:focus-visible {
    outline: none;
  }
  .event-card-copy-link {
    display: inline-flex;
    justify-self: end;
  }
  .event-card-copy-link :global(.copy-link-wrapper) {
    flex-wrap: nowrap;
    width: auto;
  }
  .event-card-copy-link :global(.copy-link-btn) {
    width: auto;
    min-height: 1.9rem;
    padding: 0.32rem 0.55rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1;
    white-space: nowrap;
  }
  .event-card-image,
  .event-card-icon {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 0.75rem;
  }
  .event-card-image {
    object-fit: cover;
    object-position: top center;
  }
  .event-card-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #7b1113;
    color: white;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
  }
  .event-card-copy {
    display: grid;
    min-width: 0;
    gap: 0.2rem;
  }
  .event-card-title {
    overflow: hidden;
    color: #18181b;
    font-size: 0.875rem;
    font-weight: 800;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .event-card-meta {
    overflow: hidden;
    color: #71717a;
    font-size: 0.75rem;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .event-card-action {
    width: max-content;
    color: #7b1113;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1.2;
  }
  @media (max-width: 425px) {
    .event-card-main {
      grid-template-columns: 3rem minmax(0, 1fr);
    }
    .event-card-image,
    .event-card-icon {
      width: 3rem;
      height: 3rem;
    }
  }
</style>
