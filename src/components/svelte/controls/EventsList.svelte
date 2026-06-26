<script lang="ts">
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import CopyLinkButton from "../CopyLinkButton.svelte";
  import { getAppData } from "@lib/context";
  import { getEventImage } from "@lib/event-images";
  import { formatCampusRange } from "@lib/event-time";
  import { getEventShareUrl } from "@lib/share-links";
  import { queryStore, sidePanelStore, toastStore } from "@lib/store.svelte";
  import type { EventData } from "@lib/types";

  type EventTab = "upcoming" | "past";

  const PAGE_SIZE = 5;
  const STATUS_BADGES: Record<EventData["status"], string> = {
    active: "Happening now",
    upcoming: "Upcoming",
    past: "Past",
  };

  const appData = getAppData();
  const { events, loaded } = $derived(appData());

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

  let activeTab = $state<EventTab>("upcoming");
  let page = $state(1);

  // Default to whichever tab has events when data first loads.
  let appliedDefault = $state(false);
  $effect(() => {
    if (!loaded || appliedDefault) return;
    if (upcomingEvents.length === 0 && pastEvents.length > 0) {
      activeTab = "past";
    }
    appliedDefault = true;
  });

  const tabEvents = $derived(
    activeTab === "upcoming" ? upcomingEvents : pastEvents,
  );
  const pageCount = $derived(
    Math.max(1, Math.ceil(tabEvents.length / PAGE_SIZE)),
  );
  const currentPage = $derived(Math.min(page, pageCount));
  const pageStart = $derived((currentPage - 1) * PAGE_SIZE);
  const pageEvents = $derived(
    tabEvents.slice(pageStart, pageStart + PAGE_SIZE),
  );
  const rangeStart = $derived(tabEvents.length === 0 ? 0 : pageStart + 1);
  const rangeEnd = $derived(Math.min(pageStart + PAGE_SIZE, tabEvents.length));

  function selectTab(tab: EventTab) {
    if (activeTab === tab) return;
    activeTab = tab;
    page = 1;
  }

  function goToPage(next: number) {
    page = Math.min(Math.max(1, next), pageCount);
  }

  function openEvent(event: EventData) {
    queryStore.updateQuery({
      category: "event",
      type: "result",
      value: event.title,
      eventSlug: event.slug,
    });
    queryStore.inputValue = event.title;
    sidePanelStore.expand();
  }
</script>

<div class="events-list-panel">
  {#if !loaded}
    <header class="events-list-header">
      <div class="events-list-kicker">
        <CalendarDays size={16} aria-hidden="true" />
        <span>Loading campus events…</span>
      </div>
      <h2>Campus events</h2>
    </header>
    <div class="events-tabs skeleton-tabs" aria-hidden="true">
      <span class="events-tab skeleton-tab"></span>
      <span class="events-tab skeleton-tab"></span>
    </div>
    <div class="events-list skeleton-list" aria-hidden="true">
      {#each [1, 2, 3] as row (row)}
        <div class="skeleton-row"></div>
      {/each}
    </div>
  {:else}
    <header class="events-list-header">
      <div class="events-list-kicker">
        <CalendarDays size={16} aria-hidden="true" />
        <span>{events.length} campus events</span>
      </div>
      <h2>Campus events</h2>
      <p>Browse events around campus. Times shown in campus time (Manila).</p>
    </header>

    <div
      class="events-tabs"
      role="tablist"
      aria-label="Filter events by status"
    >
      <button
        class="events-tab"
        class:is-active={activeTab === "upcoming"}
        type="button"
        role="tab"
        aria-selected={activeTab === "upcoming"}
        onclick={() => selectTab("upcoming")}
      >
        Upcoming
        <span class="events-tab-count">{upcomingEvents.length}</span>
      </button>
      <button
        class="events-tab"
        class:is-active={activeTab === "past"}
        type="button"
        role="tab"
        aria-selected={activeTab === "past"}
        onclick={() => selectTab("past")}
      >
        Past
        <span class="events-tab-count">{pastEvents.length}</span>
      </button>
    </div>

    {#if tabEvents.length > 0}
      <div class="events-list">
        {#each pageEvents as event (event.id)}
          {@const image = getEventImage(event.slug)}
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
                  loading="lazy"
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
                  {formatCampusRange(
                    event.occurrenceStartsAt,
                    event.occurrenceEndsAt,
                  )}
                </span>
                <span class="events-list-card-location">
                  <MapPin size={14} aria-hidden="true" />
                  {primaryLocation?.resolvedLabel ?? "No mapped location yet"}
                </span>
                <span class="events-list-card-action">Open details</span>
              </span>
            </button>
            <span class="events-list-copy-link">
              <CopyLinkButton
                url={shareUrl}
                label="Copy"
                ariaLabel={`Copy link to ${event.title}`}
                successMessage={`Copied link for ${event.title}.`}
                errorMessage={`Could not copy link for ${event.title}.`}
                feedback="none"
                variant="chip"
                onsuccess={() =>
                  toastStore.show(`Copied link for ${event.title}.`, "success")}
                onerror={() =>
                  toastStore.show(
                    `Could not copy link for ${event.title}.`,
                    "error",
                  )}
              />
            </span>
          </article>
        {/each}
      </div>

      {#if pageCount > 1}
        <nav class="events-pagination" aria-label="Events pages">
          <button
            class="events-page-button"
            type="button"
            aria-label="Previous page"
            disabled={currentPage <= 1}
            onclick={() => goToPage(currentPage - 1)}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span class="events-page-status" aria-live="polite">
            <strong>{rangeStart}–{rangeEnd}</strong> of {tabEvents.length}
          </span>
          <button
            class="events-page-button"
            type="button"
            aria-label="Next page"
            disabled={currentPage >= pageCount}
            onclick={() => goToPage(currentPage + 1)}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </nav>
      {/if}
    {:else}
      <p class="empty-events">
        {activeTab === "upcoming"
          ? "No active or upcoming campus events yet. Check back soon."
          : "No past campus events to show yet."}
      </p>
    {/if}
  {/if}
</div>

<style>
  .events-list-panel {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    gap: 0.85rem;
    overflow-y: auto;
    width: 100%;
  }

  .skeleton-tabs {
    display: flex;
    gap: 0.5rem;
  }

  .skeleton-tab {
    display: block;
    width: 6rem;
    height: 2rem;
    border-radius: 0.75rem;
    background: #f4f4f5;
  }

  .skeleton-list {
    display: grid;
    gap: 0.65rem;
  }

  .skeleton-row {
    height: 5rem;
    border-radius: 0.875rem;
    background: #f4f4f5;
  }

  .events-list-header {
    display: grid;
    gap: 0.35rem;
  }

  .events-list-kicker,
  .events-list-card-location {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .events-list-kicker {
    color: #7b1113;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    color: #18181b;
    font-size: 1.125rem;
    line-height: 1.25;
  }

  p {
    color: #3f3f46;
    font-size: 0.85rem;
    line-height: 1.45;
  }

  .events-tabs {
    display: inline-flex;
    gap: 0.25rem;
    padding: 0.25rem;
    border: 1px solid #eee1e1;
    border-radius: 999px;
    background: #fdf3f3;
  }

  .events-tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    flex: 1 1 0;
    min-height: 2.25rem;
    padding: 0.4rem 0.75rem;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: #7b1113;
    cursor: pointer;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 800;
    line-height: 1;
    transition:
      background-color 0.16s,
      color 0.16s,
      box-shadow 0.16s;
  }

  .events-tab:hover {
    background: #fbe7e7;
  }

  .events-tab.is-active {
    background: #7b1113;
    color: white;
    box-shadow: 0 1px 3px rgba(123, 17, 19, 0.35);
  }

  .events-tab:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }

  .events-tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.4rem;
    height: 1.4rem;
    padding: 0 0.4rem;
    border-radius: 999px;
    background: rgba(123, 17, 19, 0.12);
    color: inherit;
    font-size: 0.72rem;
    font-weight: 800;
  }

  .events-tab.is-active .events-tab-count {
    background: rgba(255, 255, 255, 0.24);
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
    border: 1px solid #eee1e1;
    border-radius: 0.95rem;
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }

  .events-list-card:hover,
  .events-list-card:focus-within {
    border-color: #d8b9ba;
    background-color: #fdf3f3;
  }

  .events-list-card:focus-within {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
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
    background: hsl(0, 0%, 96%);
  }

  .events-list-card-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #7b1113;
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
    color: #18181b;
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
    background: #fbe7e7;
    color: #7b1113;
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
    background: #e4e4e7;
    color: #52525b;
  }

  .events-list-card-meta,
  .events-list-card-location {
    overflow: hidden;
    color: #71717a;
    font-size: 0.75rem;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .events-list-card-action {
    width: max-content;
    color: #7b1113;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1.2;
  }

  .events-list-copy-link {
    display: inline-flex;
    flex-shrink: 0;
    padding-top: 0.125rem;
  }

  .events-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 0.15rem;
  }

  .events-page-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border: 1px solid #d8b9ba;
    border-radius: 999px;
    background: #fffafa;
    color: #7b1113;
    cursor: pointer;
    transition:
      background-color 0.16s,
      border-color 0.16s,
      opacity 0.16s;
  }

  .events-page-button:hover:not(:disabled) {
    background: #fdf3f3;
    border-color: #c58f91;
  }

  .events-page-button:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }

  .events-page-button:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .events-page-status {
    color: #3f3f46;
    font-size: 0.8rem;
    line-height: 1;
    white-space: nowrap;
  }

  .events-page-status strong {
    color: #18181b;
  }

  .empty-events {
    color: #71717a;
    font-size: 0.85rem;
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
