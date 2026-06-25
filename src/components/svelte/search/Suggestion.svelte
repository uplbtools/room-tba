<script lang="ts">
  import { queryStore, type QueryStoreState } from "../../../lib/store.svelte";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import BookText from "@lucide/svelte/icons/book-text";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import DoorClosed from "@lucide/svelte/icons/door-closed";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import Home from "@lucide/svelte/icons/home";
  import School from "@lucide/svelte/icons/school";
  import University from "@lucide/svelte/icons/university";
  import X from "@lucide/svelte/icons/x";

  let {
    value,
    category,
    id,
  }: {
    value: string;
    category: Exclude<QueryStoreState["category"], null>;
    id?: number;
  } = $props();

  function handleSuggestionClick() {
    queryStore.updateQuery({
      type: "result",
      category,
      value,
    });
    queryStore.inputValue = value;
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
    {:else if type === "event"}
      <CalendarDays size={20} />
    {/if}
  </span>
{/snippet}

<button class="suggestion" onclick={handleSuggestionClick}>
  {@render icon(category)}
  <div class="text">{value}</div>
  {#if typeof id !== "undefined"}
    <X
      size={20}
      style="margin-left:auto"
      onclick={(e) => {
        e.stopImmediatePropagation();
        queryStore.removeRecentSearch(id);
      }}
    ></X>
  {:else}
    <ArrowUpRight size={20} style="margin-left:auto" class="icon" />
  {/if}
</button>

<style>
  .suggestion {
    all: unset;
    padding: 0.5rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s;
    border-radius: 0.75rem;
    &:hover {
      background-color: hsl(0, 0%, 95%);
    }
  }

  :global(.icon) {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #000;
    flex-shrink: 0;
  }

  .text {
    font-size: 0.875rem;
    color: #18181b; /* zinc-900 */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  @media (max-width: 425px) {
    .suggestion {
      padding: 0.5rem;
    }
  }
</style>
