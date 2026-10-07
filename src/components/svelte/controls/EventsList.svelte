<script lang="ts">
  import EntitySkeleton from "@ui/EntitySkeleton.svelte";
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import EntityPanelHeader from "./EntityPanelHeader.svelte";
  import EntityShareCopyLink from "./EntityShareCopyLink.svelte";
  import { getAppData } from "@lib/context";
  import { getEventImage } from "@lib/event-images";
  import { formatCampusRange } from "@lib/event-time";
  import { getEventShareUrl } from "@lib/share-links";
  import {
    appBootstrapStore,
    queryStore,
    sidePanelStore,
  } from "@lib/store.svelte";
  import { campusListState } from "@lib/campus-list-state";
  import { onlineStatus } from "@lib/stores/online-status.svelte";
  import type { EventData } from "@lib/types";
  import EventResult from "./EventResult.svelte";

  /**
   * One list, Google Maps style: what is on now and next first, then past
   * events, each labelled. It used to open on a "Past" tab whenever nothing
   * was upcoming, so the list read as if the past events were current.
   */

  /** Past events start folded to this many; the rest are a tap away. */
  const PAST_PREVIEW = 5;
  const STATUS_BADGES: Record<EventData["status"], string> = {
    active: "Happening now",
    upcoming: "Upcoming",
    past: "Past",
  };

  const appData = getAppData();
  const { events, loaded } = $derived(appData());
  // Skeleton while campus data is still loading behind the map; offline with
  // nothing saved says so instead of "no events yet".
  const eventsState = $derived(
    campusListState({
      count: events?.length ?? 0,
      loaded,
      phase: appBootstrapStore.phase,
      online: onlineStatus.online,
    }),
  );

  const upcomingEvents = $derived.by(() => {
    if (!loaded) return [];
    return events
      .filter(
        (event) => event.status === "active" || event.status === "upcoming",
      )
      .sort((a, b) => a.occurrenceStartsAt.localeCompare(b.occurrenceStartsAt));
  });

  const pastEvents = $derived.by(() => {
    if (!loaded) return [];
    return events
      .filter((event) => event.status === "past")
      .sort((a, b) => b.occurrenceStartsAt.localeCompare(a.occurrenceStartsAt));
  });

  let showAllPast = $state(false);
  const visiblePast = $derived(
    showAllPast ? pastEvents : pastEvents.slice(0, PAST_PREVIEW),
  );

  function openEvent(event: EventData) {
    queryStore.updateQuery({
      category: "event",
      type: "result",
      value: event.title,
      eventSlug: event.slug,
    });
    queryStore.inputValue = event.title;
    sidePanelStore.openPanel({
      type: "search-result",
      component: EventResult,
    });
  }
</script>

{#snippet eventCard(event: EventData)}
  {@const image = getEventImage(event.slug, event.imageUrl, event.title)}
  {@const primaryLocation =
    event.locations.find((location) => location.isPrimary) ??
    event.locations[0] ??
    null}
  {@const shareUrl = getEventShareUrl(event.slug)}
  <article class="events-list-card">
    <button
      class="events-list-card-main"
      type="button"
      aria-label={`Open ${event.title} details`}
      onclick={() => openEvent(event)}
    >
      {#if image}
        <img
          class="events-list-card-image"
          src={image.src}
          alt=""
          width="64"
          height="64"
          loading="lazy"
          decoding="async"
        />
      {:else}
        <span class="events-list-card-icon" aria-hidden="true">
          <CalendarDays size={20} />
        </span>
      {/if}
      <span class="events-list-card-copy">
        <span class="events-list-card-top">
          <span class="events-list-card-title">{event.title}</span>
          <span
            class="events-status-badge"
            class:is-active={event.status === "active"}
            class:is-past={event.status === "past"}
          >
            {STATUS_BADGES[event.status]}
          </span>
        </span>
        <span class="events-list-card-meta">
          {formatCampusRange(event.occurrenceStartsAt, event.occurrenceEndsAt)}
        </span>
        <span class="events-list-card-location">
          <MapPin size={14} aria-hidden="true" />
          {primaryLocation?.resolvedLabel ?? "No mapped location yet"}
        </span>
        <span class="events-list-card-action">Open details</span>
      </span>
    </button>
    <span class="events-list-copy-link">
      <EntityShareCopyLink url={shareUrl} entityLabel={event.title} />
    </span>
  </article>
{/snippet}

<!-- No close button: the search bar names this list and its X closes it. -->
<div class="events-list-panel">
  {#if eventsState === "loading" || !loaded}
    <EntityPanelHeader>
      {#snippet trailing()}
        <h2 class="entity-header__title">Campus events</h2>
        <p class="entity-panel-note">
          <LoadingIndicator label="Loading campus events…" />
        </p>
      {/snippet}
    </EntityPanelHeader>
    <!-- Header LoadingIndicator already announces the load; empty label keeps
         the skeleton out of the accessibility tree. -->
    <EntitySkeleton variant="events" label="" />
  {:else}
    <EntityPanelHeader>
      {#snippet trailing()}
        <h2 class="entity-header__title">Campus events</h2>
        <p class="entity-panel-note">Times shown in campus time (Manila).</p>
      {/snippet}
    </EntityPanelHeader>

    <section class="events-section" aria-labelledby="events-upcoming-heading">
      <h3 id="events-upcoming-heading" class="events-section-heading">
        Upcoming
      </h3>
      {#if upcomingEvents.length > 0}
        <div class="events-list">
          {#each upcomingEvents as event (event.id)}
            {@render eventCard(event)}
          {/each}
        </div>
      {:else}
        <p class="empty-events">
          {eventsState === "offline"
            ? "Events aren’t available offline yet. Connect to the internet once and they’ll be saved on this device."
            : "No upcoming campus events right now. Check back soon."}
        </p>
      {/if}
    </section>

    {#if pastEvents.length > 0}
      <section class="events-section" aria-labelledby="events-past-heading">
        <h3 id="events-past-heading" class="events-section-heading">
          Past events
        </h3>
        <div class="events-list">
          {#each visiblePast as event (event.id)}
            {@render eventCard(event)}
          {/each}
        </div>
        {#if pastEvents.length > PAST_PREVIEW}
          <button
            type="button"
            class="events-more"
            aria-expanded={showAllPast}
            onclick={() => (showAllPast = !showAllPast)}
          >
            {showAllPast
              ? "Show fewer past events"
              : `Show all ${pastEvents.length} past events`}
          </button>
        {/if}
      </section>
    {/if}
  {/if}
</div>

<style>
  @import "./entity-detail.css";

  .events-list-panel {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    gap: 0.85rem;
    overflow-y: auto;
    width: 100%;
  }

  .events-list-card-location {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    color: var(--theme-text, #18181b);
    font-size: 1.125rem;
    line-height: 1.25;
  }

  p {
    color: var(--theme-text, #3f3f46);
    font-size: 0.85rem;
    line-height: 1.45;
  }

  .events-section {
    display: grid;
    gap: 0.5rem;
  }

  .events-section-heading {
    margin: 0;
    color: #3f3f46;
    font-size: 0.8125rem;
    font-weight: 800;
    letter-spacing: 0.02em;
  }

  .events-more {
    justify-self: start;
    min-height: 2.25rem;
    padding: 0 0.75rem;
    border: 1px solid #eee1e1;
    border-radius: 999px;
    background: #fff;
    color: #7b1113;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 700;
    cursor: pointer;
  }

  .events-list {
    display: grid;
    gap: 0.65rem;
  }

  .events-list-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 0.5rem;
    padding: 0.55rem;
    border: 1px solid var(--theme-accent-border, #eee1e1);
    border-radius: 0.95rem;
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }

  .events-list-card:hover,
  .events-list-card:focus-within {
    border-color: var(--theme-accent-border, #d8b9ba);
    background-color: var(--theme-accent-soft, #fdf3f3);
  }

  .events-list-card:focus-within {
    outline: 2px solid var(--theme-accent-text, #7b1113);
    outline-offset: -2px;
  }

  .events-list-card-main {
    all: unset;
    display: grid;
    grid-template-columns: 4rem minmax(0, 1fr);
    align-items: center;
    min-width: 0;
    gap: 0.7rem;
    cursor: pointer;
  }

  .events-list-card-main:focus-visible {
    outline: none;
  }

  .events-list-card-image,
  .events-list-card-icon {
    width: 4rem;
    height: 4rem;
    border-radius: 0.8rem;
  }

  .events-list-card-image {
    object-fit: contain;
    background: var(--theme-surface-2, hsl(0, 0%, 96%));
  }

  .events-list-card-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--theme-accent-fill, #7b1113);
    color: white;
  }

  .events-list-card-copy {
    display: grid;
    min-width: 0;
    gap: 0.2rem;
  }

  .events-list-card-top {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
  }

  .events-list-card-title {
    min-width: 0;
    overflow: hidden;
    color: var(--theme-text, #18181b);
    font-size: 0.9rem;
    font-weight: 800;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .events-status-badge {
    flex: 0 0 auto;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    background: var(--theme-accent-soft, #fbe7e7);
    color: var(--theme-accent-text, #7b1113);
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .events-status-badge.is-active {
    background: #15803d;
    color: white;
  }

  .events-status-badge.is-past {
    background: var(--theme-surface-3, #e4e4e7);
    color: var(--theme-text-2, #52525b);
  }

  .events-list-card-meta,
  .events-list-card-location {
    overflow: hidden;
    color: var(--theme-text-2, #71717a);
    font-size: 0.75rem;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .events-list-card-action {
    width: max-content;
    color: var(--theme-accent-text, #7b1113);
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1.2;
  }

  .events-list-copy-link {
    display: inline-flex;
    flex-shrink: 0;
    align-items: flex-start;
  }

  .empty-events {
    padding: 0.75rem;
    border: 1px dashed #e4d4d4;
    border-radius: 0.75rem;
    color: #3f3f46;
    font-size: 0.875rem;
    font-weight: 600;
  }

  @media (max-width: 425px) {
    .events-list-card-main {
      grid-template-columns: 3rem minmax(0, 1fr);
    }

    .events-list-card-image,
    .events-list-card-icon {
      width: 3rem;
      height: 3rem;
    }
  }
</style>
