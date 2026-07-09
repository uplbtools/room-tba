<script lang="ts">
  import { getColorForCourse } from "@lib/schedule-renderer";
  import { sectionBlocks } from "@lib/planner/conflicts";
  import { alternativeOfferings } from "@lib/planner/alternatives";
  import type { Conflict, ScheduleBlock } from "@lib/planner/conflicts";
  import type { PlannedSection } from "@lib/planner/types";
  import type { ClassMapValue } from "@lib/types";

  interface Props {
    sections: PlannedSection[];
    conflicts: Conflict[];
    /** All class rows for the plan's courses — the source for drag targets (#506). */
    alternatives?: ClassMapValue[];
    onremove: (courseCode: string, section: string) => void;
    onopenroom: (roomCode: string) => void;
    onswap?: (courseCode: string, toSections: ClassMapValue[]) => void;
  }

  const {
    sections,
    conflicts,
    alternatives = [],
    onremove,
    onopenroom,
    onswap,
  }: Props = $props();

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
        byDay[block.dayIndex]?.push({
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

  // --- Drag to switch section (#506) -------------------------------------
  type Drag = { courseCode: string; fromSection: string; fromKey: string };
  let drag = $state<Drag | null>(null);
  let hoverGhost = $state<string | null>(null);
  let pointerPos = $state<{ x: number; y: number } | null>(null);

  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let pending: { block: GridBlock; el: HTMLElement } | null = null;
  let longPress: ReturnType<typeof setTimeout> | null = null;
  let suppressClick = false;

  const THRESHOLD = 6;
  const LONG_PRESS_MS = 400;

  const ghostBlocksByDay = $derived.by(() => {
    const byDay: {
      dayIndex: number;
      startMin: number;
      endMin: number;
      ghostKey: string;
      roomCode: string | null;
      col: number;
      colCount: number;
    }[][] = DAYS.map(() => []);
    if (!drag) return byDay;
    const offerings = alternativeOfferings(
      alternatives,
      drag.courseCode,
      drag.fromSection,
    );
    for (const offering of offerings) {
      for (const row of offering.sections) {
        const blocks = sectionBlocks({
          courseCode: row.courseCode ?? drag.courseCode,
          section: row.section ?? offering.section,
          type: row.type ?? "",
          schedule: row.schedule ?? [],
          roomCode: row.roomCode ?? null,
          courseTitle: row.courseTitle ?? null,
        });
        for (const b of blocks) {
          if (b.dayIndex < 0 || b.dayIndex >= DAYS.length) continue;
          byDay[b.dayIndex]?.push({
            dayIndex: b.dayIndex,
            startMin: b.startMin,
            endMin: b.endMin,
            ghostKey: offering.section,
            roomCode: row.roomCode ?? null,
            col: 0,
            colCount: 1,
          });
        }
      }
    }
    // Sections at the same day+time (e.g. HUM 3 C1 & C2, both WF 10:00) would
    // otherwise stack exactly and hide all but the top ghost. Split each shared
    // slot into side-by-side columns so every alternative stays droppable.
    for (const dayGhosts of byDay) {
      const bySlot = new Map<string, typeof dayGhosts>();
      for (const g of dayGhosts) {
        const slot = `${g.startMin}-${g.endMin}`;
        const list = bySlot.get(slot) ?? [];
        list.push(g);
        bySlot.set(slot, list);
      }
      for (const list of bySlot.values()) {
        list.forEach((g, i) => {
          g.col = i;
          g.colCount = list.length;
        });
      }
    }
    return byDay;
  });

  function beginDrag(block: GridBlock, el: HTMLElement, e: PointerEvent) {
    drag = {
      courseCode: block.courseCode,
      fromSection: block.section,
      fromKey: block.key,
    };
    selectedKey = null;
    pointerPos = { x: e.clientX, y: e.clientY };
    // Stop the browser from scrolling the grid once a drag is underway.
    el.style.touchAction = "none";
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // capture unsupported — pointer events still bubble to the element
    }
  }

  function cleanup() {
    if (longPress) clearTimeout(longPress);
    longPress = null;
    if (drag && pending && pointerId !== null) {
      pending.el.style.touchAction = "";
      try {
        pending.el.releasePointerCapture(pointerId);
      } catch {
        // capture may already be released
      }
    }
    if (drag) suppressClick = true;
    drag = null;
    hoverGhost = null;
    pointerPos = null;
    pointerId = null;
    pending = null;
  }

  function onBlockPointerDown(e: PointerEvent, block: GridBlock) {
    if (e.button > 0) return; // ignore right/middle click
    suppressClick = false; // clear any stale post-drag guard from a prior gesture
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    pending = { block, el: e.currentTarget as HTMLElement };
    if (e.pointerType !== "mouse") {
      // Touch/pen: only a stationary long-press starts a drag, so a normal
      // tap still selects and a swipe still scrolls the grid.
      longPress = setTimeout(() => {
        longPress = null;
        if (pending) beginDrag(pending.block, pending.el, e);
      }, LONG_PRESS_MS);
    }
  }

  function onBlockPointerMove(e: PointerEvent) {
    if (pointerId === null || e.pointerId !== pointerId || !pending) return;
    const moved = Math.hypot(e.clientX - startX, e.clientY - startY);
    if (!drag) {
      if (e.pointerType === "mouse") {
        if (moved > THRESHOLD) beginDrag(pending.block, pending.el, e);
      } else if (moved > THRESHOLD && longPress) {
        // Moved before the long-press fired — treat as a scroll, not a drag.
        clearTimeout(longPress);
        cleanup();
      }
      return;
    }
    e.preventDefault();
    pointerPos = { x: e.clientX, y: e.clientY };
    const el = document.elementFromPoint(e.clientX, e.clientY);
    hoverGhost =
      el?.closest<HTMLElement>("[data-ghost]")?.dataset["ghost"] ?? null;
  }

  function onBlockPointerUp(e: PointerEvent) {
    if (pointerId === null || e.pointerId !== pointerId) return;
    if (drag && hoverGhost) {
      const target = alternativeOfferings(
        alternatives,
        drag.courseCode,
        drag.fromSection,
      ).find((o) => o.section === hoverGhost);
      if (target) onswap?.(drag.courseCode, target.sections);
    }
    cleanup();
  }

  function onBlockClick(block: GridBlock) {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    selectedKey = selectedKey === block.key ? null : block.key;
  }

  $effect(() => {
    if (!drag) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cleanup();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const hourLabel = (hour: number) =>
    `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? "PM" : "AM"}`;

  const topPct = (min: number) =>
    ((min - START_HOUR * 60) / TOTAL_MIN) * 100;
  const heightPct = (startMin: number, endMin: number) =>
    ((endMin - startMin) / TOTAL_MIN) * 100;
</script>

<div class="planner-grid-scroll">
  <div class="planner-grid" class:planner-grid--dragging={drag}>
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
              class:planner-block--dragging={drag?.fromKey === block.key}
              style:top="{topPct(block.startMin)}%"
              style:height="{heightPct(block.startMin, block.endMin)}%"
              style:background-color={getColorForCourse(block.courseCode)}
            >
              <button
                type="button"
                class="planner-block__label"
                title="{block.courseCode} {block.type} {block.section}{block.roomCode
                  ? ` · ${block.roomCode}`
                  : ''} — drag to switch section"
                onclick={() => onBlockClick(block)}
                onpointerdown={(e) => onBlockPointerDown(e, block)}
                onpointermove={onBlockPointerMove}
                onpointerup={onBlockPointerUp}
                onpointercancel={cleanup}
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

          {#if drag}
            {#each ghostBlocksByDay[dayIndex] as ghost (ghost.ghostKey + ghost.startMin)}
              <div
                class="planner-ghost"
                class:planner-ghost--hover={hoverGhost === ghost.ghostKey}
                data-ghost={ghost.ghostKey}
                style:top="{topPct(ghost.startMin)}%"
                style:height="{heightPct(ghost.startMin, ghost.endMin)}%"
                style:left="calc({(ghost.col / ghost.colCount) * 100}% + 1px)"
                style:width="calc({100 / ghost.colCount}% - 2px)"
                style:border-color={getColorForCourse(drag.courseCode)}
              >
                <span class="planner-ghost__label">{ghost.ghostKey}</span>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

{#if drag && pointerPos}
  <div
    class="planner-drag-pill"
    style:left="{pointerPos.x}px"
    style:top="{pointerPos.y}px"
    aria-hidden="true"
  >
    {drag.courseCode}
    {#if hoverGhost}→ {hoverGhost}{:else}· drop on a section{/if}
  </div>
{/if}

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
    touch-action: pan-x pan-y;
  }

  /* While dragging, other blocks stop intercepting hit-tests so
     elementFromPoint resolves to the ghost drop targets under the pointer.
     The dragged block keeps pointer-events so its captured pointer stream
     (move/up) keeps flowing — it only ever covers its own cell, never a ghost. */
  .planner-grid--dragging .planner-block {
    pointer-events: none;
  }

  .planner-grid--dragging .planner-block--dragging {
    pointer-events: auto;
    opacity: 0.4;
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
    cursor: grab;
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

  .planner-ghost {
    position: absolute;
    /* left/width are set inline so same-slot ghosts tile into columns. */
    box-sizing: border-box;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed hsl(0, 0%, 55%);
    border-radius: 0.25rem;
    background: hsl(0, 0%, 100%, 0.55);
    color: hsl(0, 0%, 25%);
    cursor: copy;
  }

  .planner-ghost--hover {
    background: hsl(140, 60%, 92%, 0.9);
    border-style: solid;
    box-shadow: 0 0 0 2px hsl(140, 60%, 35%);
  }

  .planner-ghost__label {
    font-size: 0.6875rem;
    font-weight: 700;
    pointer-events: none;
  }

  .planner-drag-pill {
    position: fixed;
    z-index: 40;
    transform: translate(-50%, calc(-100% - 0.75rem));
    padding: 0.25rem 0.5rem;
    border-radius: 999px;
    background: hsl(0, 0%, 12%);
    color: white;
    font-size: 0.6875rem;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .planner-ghost {
      transition: none;
    }
  }
</style>
