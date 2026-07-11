<script lang="ts">
  import type { BuildingData, EventData } from "@lib/types";
  import { queryStore, type QueryStoreState } from "@lib/store.svelte";
  import {
    entityHoverPreviewStore,
    buildingPreviewFromRow,
    eventPreviewFromRow,
  } from "@lib/entity-hover-preview.svelte";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import BookText from "@lucide/svelte/icons/book-text";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import DoorClosed from "@lucide/svelte/icons/door-closed";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import Home from "@lucide/svelte/icons/home";
  import MapPin from "@lucide/svelte/icons/map-pin";
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
  }: {
    value: string;
    category: Exclude<QueryStoreState["category"], null>;
    id?: number;
    eventSlug?: string;
    building?: BuildingData;
    event?: EventData;
  } = $props();

  function handleSuggestionClick() {
    entityHoverPreviewStore.hideNow();
    queryStore.updateQuery({
      type: "result",
      category,
      value,
      eventSlug,
    });
    queryStore.inputValue = value;
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
    <div class="text">{value}</div>
    {#if typeof id === "undefined"}
      <ArrowUpRight size={20} class="icon trailing" />
    {/if}
  </button>
  {#if typeof id !== "undefined"}
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

  .suggestion-remove {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2rem;
    cursor: pointer;
    border-radius: 0.5rem;
    color: #52525b;
  }

  .suggestion-remove:hover,
  .suggestion-remove:focus-visible {
    background-color: hsl(0, 0%, 90%);
    color: #18181b;
  }

  :global(.icon) {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #000;
    flex-shrink: 0;
  }

  :global(.icon.trailing) {
    margin-left: auto;
  }

  .text {
    font-size: 0.875rem;
    color: #18181b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 425px) {
    .suggestion {
      padding: 0.4375rem 0.375rem;
    }
  }
</style>
