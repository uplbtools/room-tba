<script lang="ts">
  import type { BuildingData, EventData } from "@lib/types";
  import {
    directionsStore,
    MAX_DIRECTIONS_WAYPOINTS,
    queryStore,
    toastStore,
    type QueryStoreState,
  } from "@lib/store.svelte";
  import { matchHighlightRange } from "@lib/search-suggestions";
  import { selectSuggestion } from "@lib/search-select";
  import {
    entityHoverPreviewStore,
    buildingPreviewFromRow,
    eventPreviewFromRow,
  } from "@lib/entity-hover-preview.svelte";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import BookText from "@lucide/svelte/icons/book-text";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import Check from "@lucide/svelte/icons/check";
  import DoorClosed from "@lucide/svelte/icons/door-closed";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import Home from "@lucide/svelte/icons/home";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Plus from "@lucide/svelte/icons/plus";
  import School from "@lucide/svelte/icons/school";
  import University from "@lucide/svelte/icons/university";
  import Users from "@lucide/svelte/icons/users";
  import X from "@lucide/svelte/icons/x";

  let {
    value,
    category,
    id,
    eventSlug,
    building,
    event: eventData,
    secondary,
    courseCode,
    roomCode,
    lat = null,
    lon = null,
  }: {
    value: string;
    category: Exclude<QueryStoreState["category"], null>;
    id?: number;
    eventSlug?: string;
    building?: BuildingData;
    event?: EventData;
    /** Supporting line under the value, e.g. a room's unabbreviated name (#875). */
    secondary?: string | null;
    /** Class sections: the course, and the room selecting it opens. */
    courseCode?: string;
    roomCode?: string | null;
    lat?: number | null;
    lon?: number | null;
  } = $props();

  const stopLat = $derived(lat ?? building?.lat ?? null);
  const stopLon = $derived(lon ?? building?.lon ?? null);

  const canAddStop = $derived(
    directionsStore.active &&
      !directionsStore.navigating &&
      directionsStore.waypoints.length < MAX_DIRECTIONS_WAYPOINTS &&
      stopLat != null &&
      stopLon != null &&
      Number.isFinite(stopLat) &&
      Number.isFinite(stopLon),
  );

  let justAdded = $state(false);
  let addedTimer: ReturnType<typeof setTimeout> | null = null;

  function handleSuggestionClick() {
    selectSuggestion({
      value,
      category,
      eventSlug,
      building,
      lat: stopLat,
      lon: stopLon,
      courseCode,
      roomCode,
    });
  }

  function handleAddStop(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (stopLat == null || stopLon == null || !canAddStop) return;
    entityHoverPreviewStore.hideNow();
    const before = directionsStore.waypoints.length;
    void directionsStore
      .addWaypoint({
        lat: stopLat,
        lng: stopLon,
        label: value,
      })
      .then(() => {
        if (directionsStore.waypoints.length <= before) return;
        toastStore.show(`Added ${value} as a stop`, "success");
        justAdded = true;
        if (addedTimer) clearTimeout(addedTimer);
        addedTimer = setTimeout(() => {
          justAdded = false;
          addedTimer = null;
        }, 900);
      });
    // Clear the query text but stay in search mode so another stop can be typed.
    queryStore.exitResultMode();
    queryStore.inputValue = "";
  }

  function handleRemoveRecent(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof id === "undefined") return;
    queryStore.removeRecentSearch(id);
  }

  // Hover preview for buildings and events (#288)
  function handleMouseEnter(event: MouseEvent) {
    if (category === "building" && building) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      entityHoverPreviewStore.show(buildingPreviewFromRow(building), {
        x: rect.right,
        y: rect.top + rect.height / 2,
      });
    } else if (category === "event" && eventData) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      entityHoverPreviewStore.show(eventPreviewFromRow(eventData), {
        x: rect.right,
        y: rect.top + rect.height / 2,
      });
    }
  }

  function handleMouseLeave() {
    entityHoverPreviewStore.scheduleHide();
  }

  function handleFocus(event: FocusEvent) {
    // Show preview on keyboard focus too
    handleMouseEnter(event as unknown as MouseEvent);
  }

  /** Bold only the typed characters where they start a word (GMaps style). */
  const labelParts = $derived.by(() => {
    const range = matchHighlightRange(value, queryStore.inputValue);
    if (!range) return [{ text: value, matched: false }];
    const [idx, end] = range;
    const parts: { text: string; matched: boolean }[] = [];
    if (idx > 0) parts.push({ text: value.slice(0, idx), matched: false });
    parts.push({ text: value.slice(idx, end), matched: true });
    if (end < value.length) {
      parts.push({ text: value.slice(end), matched: false });
    }
    return parts;
  });

  const hasMatchHighlight = $derived(labelParts.some((p) => p.matched));
</script>

{#snippet icon(type: typeof category)}
  <span class="icon">
    {#if type === "building"}
      <University size={20} />
    {:else if type === "division"}
      <School size={20} />
    {:else if type === "college"}
      <GraduationCap size={20} />
    {:else if type === "room"}
      <DoorClosed size={20} />
    {:else if type === "class"}
      <BookText size={20} />
    {:else if type === "dorm"}
      <Home size={20} />
    {:else if type === "event" || type === "events"}
      <CalendarDays size={20} />
    {:else if type === "organization"}
      <Users size={20} />
    {:else if type === "place"}
      <MapPin size={20} />
    {:else}
      <MapPin size={20} />
    {/if}
  </span>
{/snippet}

<div class="suggestion-row">
  <button
    type="button"
    class="suggestion"
    onclick={handleSuggestionClick}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    onfocus={handleFocus}
  >
    {@render icon(category)}
    <div class="text">
      {#each labelParts as part, i (i)}
        <span
          class:match={part.matched}
          class:rest={hasMatchHighlight && !part.matched}>{part.text}</span
        >
      {/each}
      {#if secondary}
        <span class="text-secondary">{secondary}</span>
      {/if}
    </div>
    {#if typeof id === "undefined" && !canAddStop}
      <ArrowUpRight size={18} class="icon trailing" />
    {/if}
  </button>
  {#if canAddStop || justAdded}
    <button
      type="button"
      class="suggestion-add-stop"
      class:suggestion-add-stop--added={justAdded}
      aria-label={justAdded
        ? `${value} added as a stop`
        : `Add ${value} as a directions stop`}
      disabled={justAdded}
      onmousedown={handleAddStop}
    >
      {#if justAdded}
        <Check size={16} aria-hidden="true" />
        <span>Added</span>
      {:else}
        <Plus size={16} aria-hidden="true" />
        <span>Add stop</span>
      {/if}
    </button>
  {:else if typeof id !== "undefined"}
    <button
      type="button"
      class="suggestion-remove"
      aria-label={`Remove ${value} from recent searches`}
      onmousedown={handleRemoveRecent}
    >
      <X size={18} aria-hidden="true" />
    </button>
  {/if}
</div>

<style>
  .suggestion-row {
    display: flex;
    align-items: stretch;
    gap: 0.125rem;
    border-radius: 0.5rem;
  }

  .suggestion-row:hover .suggestion,
  .suggestion-row:focus-within .suggestion {
    background-color: hsl(0, 0%, 95%);
  }

  .suggestion {
    all: unset;
    box-sizing: border-box;
    flex: 1;
    min-width: 0;
    padding: 0.4375rem 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    border-radius: 0.5rem;
  }

  @media (max-width: 48rem) {
    .suggestion {
      gap: 0.75rem;
      padding: 0.875rem 0.25rem;
      border-radius: 0;
    }

    .suggestion-row:hover .suggestion,
    .suggestion-row:focus-within .suggestion {
      background-color: transparent;
    }

    .suggestion-row:active .suggestion {
      background-color: hsl(0, 0%, 97%);
    }
  }

  .suggestion-remove {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2.75rem;
    min-height: 2.75rem;
    cursor: pointer;
    border-radius: 0.5rem;
    color: #52525b;
  }

  .suggestion-remove:hover,
  .suggestion-remove:focus-visible {
    background-color: hsl(0, 0%, 90%);
    color: #18181b;
  }

  .suggestion-add-stop {
    all: unset;
    box-sizing: border-box;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    min-height: 2rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    color: var(--color-brand, #8d1437);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .suggestion-add-stop:hover,
  .suggestion-add-stop:focus-visible {
    background-color: #fff7f7;
  }

  .suggestion-add-stop--added,
  .suggestion-add-stop--added:hover,
  .suggestion-add-stop--added:focus-visible {
    background-color: #ecfdf5;
    color: #047857;
    cursor: default;
  }

  @media (max-width: 48rem) {
    .suggestion-add-stop {
      min-height: 2.75rem;
      padding: 0.375rem 0.625rem;
      font-size: 0.8125rem;
    }
  }

  :global(.icon) {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #18181b;
    flex-shrink: 0;
  }

  :global(.icon.trailing) {
    margin-left: auto;
  }

  .text {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 0.875rem;
    color: #18181b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .text-secondary {
    color: #52525b;
  }

  .text-secondary::before {
    content: " · ";
  }

  .text .match {
    font-weight: 700;
    color: #18181b;
  }

  .text .rest {
    font-weight: 400;
    color: #8b8b96;
  }

  @media (max-width: 48rem) {
    .text {
      font-size: 0.9375rem;
    }
  }

  @media (max-width: 425px) {
    .suggestion {
      padding: 0.875rem 0.25rem;
    }
  }
</style>
