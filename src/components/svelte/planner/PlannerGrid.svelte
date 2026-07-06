<script lang="ts">
  import { getColorForCourse } from "@lib/schedule-renderer";
  import { sectionBlocks } from "@lib/planner/conflicts";
  import type { Conflict, ScheduleBlock } from "@lib/planner/conflicts";
  import type { PlannedSection } from "@lib/planner/types";

  interface Props {
    sections: PlannedSection[];
    conflicts: Conflict[];
    onremove: (courseCode: string, section: string) => void;
    onopenroom: (roomCode: string) => void;
  }

  const { sections, conflicts, onremove, onopenroom }: Props = $props();

  // Same window as the room-schedule canvas (ScheduleRenderer.config).
  const START_HOUR = 7;
  const END_HOUR = 20;
  const TOTAL_MIN = (END_HOUR - START_HOUR) * 60;
  const DAYS = ["M", "T", "W", "Th", "F", "S"];
  const HOURS = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => START_HOUR + i,
  );

  type GridBlock = ScheduleBlock & {
    key: string;
    roomCode: string | null;
    conflicted: boolean;
  };

  const blockKey = (b: ScheduleBlock) =>
    `${b.courseCode}::${b.section}::${b.type}::${b.dayIndex}::${b.startMin}`;

  const conflictedKeys = $derived(
    new Set(conflicts.flatMap((c) => [blockKey(c.a), blockKey(c.b)])),
  );

  const blocksByDay = $derived.by(() => {
    const byDay: GridBlock[][] = DAYS.map(() => []);
    for (const section of sections) {
      for (const block of sectionBlocks(section)) {
        if (block.dayIndex < 0 || block.dayIndex >= DAYS.length) continue;
        byDay[block.dayIndex].push({
          ...block,
          key: blockKey(block),
          roomCode: section.roomCode,
          conflicted: conflictedKeys.has(blockKey(block)),
        });
      }
    }
    return byDay;
  });

  let selectedKey = $state<string | null>(null);

  const hourLabel = (hour: number) =>
    `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? "PM" : "AM"}`;

  const topPct = (min: number) =>
    ((min - START_HOUR * 60) / TOTAL_MIN) * 100;
  const heightPct = (startMin: number, endMin: number) =>
    ((endMin - startMin) / TOTAL_MIN) * 100;
</script>

<div class="planner-grid-scroll">
  <div class="planner-grid">
    <div class="planner-grid__time" aria-hidden="true">
      {#each HOURS as hour (hour)}
        <div class="planner-grid__hour">{hourLabel(hour)}</div>
      {/each}
    </div>
    {#each DAYS as day, dayIndex (day)}
      <div class="planner-grid__day">
        <div class="planner-grid__day-label">{day}</div>
        <div class="planner-grid__day-body">
          {#each blocksByDay[dayIndex] as block (block.key)}
            <div
              class="planner-block"
              class:planner-block--conflict={block.conflicted}
              class:planner-block--selected={selectedKey === block.key}
              style:top="{topPct(block.startMin)}%"
              style:height="{heightPct(block.startMin, block.endMin)}%"
              style:background-color={getColorForCourse(block.courseCode)}
            >
              <button
                type="button"
                class="planner-block__label"
                title="{block.courseCode} {block.type} {block.section}{block.roomCode
                  ? ` · ${block.roomCode}`
                  : ''}"
                onclick={() =>
                  (selectedKey =
                    selectedKey === block.key ? null : block.key)}
              >
                <span class="planner-block__course">{block.courseCode}</span>
                <span class="planner-block__section">
                  {block.type} · {block.section}
                </span>
              </button>
              {#if selectedKey === block.key}
                <div class="planner-block__actions">
                  <button
                    type="button"
                    onclick={() => onremove(block.courseCode, block.section)}
                  >
                    Remove
                  </button>
                  {#if block.roomCode}
                    <button
                      type="button"
                      onclick={() => onopenroom(block.roomCode ?? "")}
                    >
                      Room
                    </button>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .planner-grid-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .planner-grid {
    display: grid;
    grid-template-columns: 3rem repeat(6, minmax(4.5rem, 1fr));
    min-width: 30rem;
    border: 1px solid hsl(0, 0%, 88%);
    border-radius: 0.5rem;
    background: white;
    overflow: hidden;
  }

  .planner-grid__time {
    display: flex;
    flex-direction: column;
    padding-top: 1.5rem;
    background: hsl(5, 53%, 28%);
  }

  .planner-grid__hour {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    color: white;
    font-size: 0.625rem;
    padding-top: 0.125rem;
  }

  .planner-grid__day {
    display: flex;
    flex-direction: column;
    border-left: 1px solid hsl(0, 0%, 90%);
    min-width: 0;
  }

  .planner-grid__day-label {
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: hsl(5, 53%, 32%);
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .planner-grid__day-body {
    position: relative;
    height: 32.5rem; /* 13 hours × 2.5rem */
    background-image: repeating-linear-gradient(
      to bottom,
      transparent,
      transparent calc(2.5rem - 1px),
      hsl(0, 0%, 93%) calc(2.5rem - 1px),
      hsl(0, 0%, 93%) 2.5rem
    );
  }

  .planner-block {
    position: absolute;
    left: 1px;
    right: 1px;
    border-radius: 0.25rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .planner-block--conflict {
    outline: 2px solid hsl(0, 85%, 45%);
    outline-offset: -2px;
  }

  .planner-block--selected {
    z-index: 2;
    overflow: visible;
  }

  .planner-block__label {
    all: unset;
    box-sizing: border-box;
    display: block;
    flex: 1;
    min-height: 0;
    width: 100%;
    padding: 0.125rem 0.25rem;
    color: white;
    cursor: pointer;
    overflow: hidden;
  }

  .planner-block__label:focus-visible {
    outline: 2px solid white;
    outline-offset: -2px;
  }

  .planner-block__course {
    display: block;
    font-size: 0.6875rem;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .planner-block__section {
    display: block;
    font-size: 0.625rem;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.9;
  }

  .planner-block__actions {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 3;
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background: white;
    border: 1px solid hsl(0, 0%, 85%);
    border-radius: 0.375rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .planner-block__actions button {
    all: unset;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.6875rem;
    font-weight: 600;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
  }

  .planner-block__actions button:hover,
  .planner-block__actions button:focus-visible {
    background: hsl(5, 53%, 96%);
  }
</style>
