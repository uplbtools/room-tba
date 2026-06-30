<script lang="ts">
  import { queryStore } from "@lib/store.svelte";
  import type { RoomData } from "@lib/types";

  type Props = {
    room: RoomData;
    searchInput: string;
    classCount?: number | null;
  };

  const { room, searchInput, classCount }: Props = $props();
  const pattern = $derived(new RegExp(`(${searchInput.trim()})`, "gi"));
  function highlightSearch(original: string, pattern: RegExp): string {
    return searchInput.length < 2
      ? original
      : original.replaceAll(pattern, (substr) => `<mark>${substr}</mark>`);
  }

  // Class count is undefined while the batched count request is in flight (or
  // offline), so the chip stays empty rather than flashing a wrong "0". A
  // loaded 0 renders explicitly as "0 classes" (#342).
  const classCountLabel = $derived(
    typeof classCount === "number"
      ? `${classCount} class${classCount !== 1 ? "es" : ""}`
      : null,
  );

  function openRoomData() {
    queryStore.updateQuery({
      type: "result",
      category: "room",
      value: room.code,
    });
    queryStore.inputValue = room.code;
  }
</script>

<button class="room-data" onclick={openRoomData}>
  <div class="room-data__content">
    <div class="icon-wrapper">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><line x1="7" y1="17" x2="17" y2="7"></line><polyline
          points="7 7 17 7 17 17"
        ></polyline></svg
      >
    </div>
    <h3 class="room-code">{@html highlightSearch(room.code, pattern)}</h3>
    {#if room.floor != null}
      <span class="floor-badge">Floor {room.floor}</span>
    {/if}
    <div class="class-count">
      {#if classCountLabel}{classCountLabel}{/if}
    </div>
  </div>
</button>

<style>
  .room-data {
    all: unset;
    display: flex;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background-color: white;
    border: 1px solid #ececec;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.125s;
    width: 100%;
    box-sizing: border-box;
  }

  .room-data:hover,
  .room-data:focus-visible {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 98%);
  }

  .room-data__content {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    width: 100%;
  }

  .icon-wrapper {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #71717a;
  }

  .room-code {
    flex: 1 1 auto;
    min-width: 0;
    font-weight: 600;
    font-size: 0.8125rem;
    color: #18181b;
    margin: 0;
    line-height: 1.25rem;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .floor-badge {
    background-color: hsl(5, 53%, 32%);
    color: white;
    border-radius: 0.25rem;
    padding: 1px 0.375rem;
    font-size: 0.6875rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .class-count {
    flex-shrink: 0;
    background-color: #f4f4f5;
    border-radius: 0.25rem;
    padding: 2px 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
    color: #71717a;
    margin-left: auto;
    white-space: nowrap;
  }

  :global(mark) {
    background-color: hsl(5, 53%, 90%);
  }
</style>
