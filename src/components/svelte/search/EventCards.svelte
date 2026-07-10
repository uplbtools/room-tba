<script lang="ts">
  import EntityShareCopyLink from "@ui/controls/EntityShareCopyLink.svelte";
  import EventShelfToolbar from "@ui/map-chrome/EventShelfToolbar.svelte";
  import { getAppData } from "@lib/context";
  import { getEventImage } from "@lib/event-images";
  import { formatCampusDateShort, formatCampusTime } from "@lib/event-time";
  import { getEventShareUrl } from "@lib/share-links";
  import { beginEventPlacement } from "@lib/event-placement";
  import { validateSubmitterName } from "@constants/proposals";
  import {
    readProposeEventDraft,
    scheduleProposeEventDraftSave,
  } from "@lib/contributor-drafts";
  import {
    eventPlacementStore,
    queryStore,
    sidePanelStore,
    syncToastStore,
    toastStore,
  } from "@lib/store.svelte";
  import { adminAuthStore } from "@lib/stores/admin-auth.svelte";
  import type { EventData } from "@lib/types";
  import { onMount } from "svelte";

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
  const visibleEvents = $derived.by(() => {
    const base = campusEvents;
    if (!import.meta.env.DEV || typeof window === "undefined") return base;

    const count = Number(
      new URLSearchParams(window.location.search).get("stressEvents") ?? 0,
    );
    if (!Number.isFinite(count) || count <= base.length || base.length === 0) {
      return base;
    }

    const copies = [];
    for (let index = 0; index < count; index += 1) {
      const source = base[index % base.length];
      copies.push({
        ...source,
        id: source.id * 10_000 + index,
        slug: `${source.slug}-stress-${index}`,
        title: `${source.title} (${index + 1})`,
      });
    }
    return copies;
  });
  const hasPastEvents = $derived(
    loaded && events.some((event) => event.status === "past"),
  );
  // Full side-panel list still adds past events and pagination.
  const hasHiddenEvents = $derived(hasPastEvents);
  const hasAnyEvents = $derived(loaded && events.length > 0);
  const eventsSyncing = $derived(
    loaded &&
      campusEvents.length === 0 &&
      !syncToastStore.allSynced &&
      (syncToastStore.currentSync === "events" ||
        syncToastStore.currentSync === null),
  );
  const placingEvent = $derived(
    eventPlacementStore.active || eventPlacementStore.creating,
  );
  let proposeSubmitterName = $state("");
  let proposeDraftReady = $state(false);

  onMount(() => {
    if (adminAuthStore.canPublish) {
      proposeDraftReady = true;
      return;
    }
    const saved = readProposeEventDraft();
    if (saved?.proposing && !eventPlacementStore.active) {
      eventPlacementStore.start(saved.draft, {
        propose: true,
        submitterName: saved.submitterName,
      });
      proposeSubmitterName = saved.submitterName;
    }
    proposeDraftReady = true;
  });

  $effect(() => {
    if (
      !proposeDraftReady ||
      adminAuthStore.canPublish ||
      !eventPlacementStore.active ||
      !eventPlacementStore.proposing
    ) {
      return;
    }
    const draft = eventPlacementStore.draft;
    if (!draft) return;
    scheduleProposeEventDraftSave(() => ({
      draft: { ...draft },
      proposing: true,
      submitterName: eventPlacementStore.submitterName,
    }));
  });

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
    queryStore.inputValue = "";
  }

  function openEventsList() {
    queryStore.updateQuery({
      category: "events",
      type: "result",
      value: "Campus events",
    });
    queryStore.inputValue = "";
    sidePanelStore.expand();
  }

  function startEventPlacement(propose = false) {
    if (placingEvent) return;
    let submitterName = "";
    if (propose && !adminAuthStore.isLoggedIn) {
      const validation = validateSubmitterName(proposeSubmitterName);
      if (!validation.ok) {
        toastStore.show(validation.error, "error");
        return;
      }
      submitterName = validation.name;
    }
    if (
      !beginEventPlacement({
        propose,
        submitterName,
      })
    ) {
      return;
    }
    oncollapse?.();
  }
</script>

{#if !loaded}
  <section class="events-section" aria-labelledby={headingId}>
    <div class="section-heading">
      <h2 id={headingId} class="events-heading">Campus events</h2>
    </div>
  </section>
{:else}
  <section class="events-section" aria-labelledby={headingId}>
    {#if showHeading}
      <div class="section-heading">
        <h2 id={headingId} class="events-heading">Campus events</h2>
        <span class="section-actions">
          <EventShelfToolbar
            layout="toolbar"
            bind:proposeSubmitterName
            {placingEvent}
            {hasAnyEvents}
            {hasHiddenEvents}
            {showRetract}
            onViewAll={openEventsList}
            onStartPlacement={startEventPlacement}
            {oncollapse}
          />
        </span>
      </div>
    {:else}
      <div class="section-actions section-actions--inline">
        <EventShelfToolbar
          layout="toolbar"
          bind:proposeSubmitterName
          {placingEvent}
          {hasAnyEvents}
          {hasHiddenEvents}
          {showRetract}
          onViewAll={openEventsList}
          onStartPlacement={startEventPlacement}
          {oncollapse}
        />
      </div>
    {/if}
    {#if visibleEvents.length > 0}
      <div class="event-list map-chrome-scroll">
        {#each visibleEvents as event (event.id)}
          {@const image = getEventImage(
            event.slug,
            event.imageUrl,
            event.title,
          )}
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
              <EntityShareCopyLink url={shareUrl} entityLabel={event.title} />
            </span>
          </div>
        {/each}
      </div>
    {:else if eventsSyncing}
      <p class="loading-events">Syncing campus events…</p>
    {:else if hasPastEvents}
      <p class="empty-events">
        No active or upcoming events right now. Use “View all” to browse past
        events.
      </p>
    {:else if adminAuthStore.canPublish}
      <p class="empty-events">
        No campus events yet. Add an event, then choose its location on the map.
      </p>
    {:else}
      <p class="empty-events">
        No campus events yet. Propose one, then choose its location on the map.
      </p>
      <div class="empty-actions">
        <EventShelfToolbar
          layout="empty"
          bind:proposeSubmitterName
          {placingEvent}
          hasAnyEvents={false}
          hasHiddenEvents={false}
          onViewAll={openEventsList}
          onStartPlacement={startEventPlacement}
        />
      </div>
    {/if}
  </section>
{/if}

<style>
  .events-section {
    display: grid;
    gap: 0.375rem;
  }
  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.375rem 0.625rem;
  }
  .section-actions {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex: 1 1 auto;
    min-width: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .section-actions--inline {
    flex: 0 0 auto;
    justify-content: flex-start;
  }

  .empty-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .events-heading {
    margin: 0;
    font-size: 1rem;
  }
  .event-list {
    display: grid;
    gap: 0.375rem;
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
    height: 3.75rem;
    border-radius: 0.875rem;
    background: linear-gradient(90deg, #f4f4f5 25%, #ececee 50%, #f4f4f5 75%);
    background-size: 200% 100%;
  }
  .event-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 0.5rem;
    padding: 0.375rem;
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
    flex-shrink: 0;
    align-items: flex-start;
  }
  .event-card-image,
  .event-card-icon {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 0.75rem;
  }
  .event-card-image {
    object-fit: contain;
    background: hsl(0, 0%, 96%);
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
