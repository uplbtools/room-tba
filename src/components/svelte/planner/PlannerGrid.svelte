<script lang="ts">
  import { getPlannerBlockColor } from "@lib/schedule-renderer";
  import { sectionBlocks } from "@lib/planner/conflicts";
  import { alternativeOfferings } from "@lib/planner/alternatives";
  import { formatMinutesRange, formatSectionType } from "@lib/planner/format";
  import type { Conflict, ScheduleBlock } from "@lib/planner/conflicts";
  import type { PlannedSection } from "@lib/planner/types";
  import type { ClassMapValue } from "@lib/types";

  interface Props {
    sections: PlannedSection[];
    conflicts: Conflict[];
    /** All class rows for the plan's courses — the source for drag targets (#506). */
    alternatives?: ClassMapValue[];
    /** Courses whose alternate-section lookup has finished (successfully or not). */
    resolvedAlternativeCourses?: string[];
    onremove: (courseCode: string, section: string) => void;
    onopenroom: (roomCode: string) => void;
    onswap?: (courseCode: string, toSections: ClassMapValue[]) => void;
  }

  const {
    sections,
    conflicts,
    alternatives = [],
    resolvedAlternativeCourses = [],
    onremove,
    onopenroom,
    onswap,
  }: Props = $props();

  const DAYS = ["M", "T", "W", "Th", "F", "S"];
  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Every block the grid may draw: the plan plus its drag alternatives, so
  // the hour window and the Saturday column stay put while dragging.
  const allBlocks = $derived([
    ...sections.flatMap((s) => sectionBlocks(s)),
    ...alternatives.flatMap((row) =>
      sectionBlocks({
        courseCode: row.courseCode ?? "",
        section: row.section ?? "",
        type: row.type ?? "",
        schedule: row.schedule ?? [],
        roomCode: null,
        courseTitle: null,
      }),
    ),
  ]);

  // Fit the window to the classes (8 AM-5 PM at least) instead of a fixed
  // 7 AM-8 PM: empty early rows pushed the first class below the fold.
  const START_HOUR = $derived(
    Math.max(
      6,
      Math.min(8, ...allBlocks.map((b) => Math.floor(b.startMin / 60))),
    ),
  );
  const END_HOUR = $derived(
    Math.min(22, Math.max(17, ...allBlocks.map((b) => Math.ceil(b.endMin / 60)))),
  );
  const TOTAL_MIN = $derived((END_HOUR - START_HOUR) * 60);
  const HOURS = $derived(
    Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i),
  );
  // Saturday only when a planned class (or, mid-drag, a drop target) lands on
  // it, so Mon-Fri fit a phone without sideways scrolling.
  const dayCount = $derived.by(() =>
    sections.some((s) => sectionBlocks(s).some((b) => b.dayIndex === 5)) ||
    (ghostBlocksByDay[5]?.length ?? 0) > 0
      ? 6
      : 5,
  );

  // The week scrolls sideways only when it does not fit; while it fits the
  // scroller stays overflow-visible so the day header can stick on scroll.
  let scrollWidth = $state(0);
  let gridWidth = $state(0);
  const overflows = $derived(gridWidth > scrollWidth + 1);

  type GridBlock = ScheduleBlock & {
    key: string;
    roomCode: string | null;
    conflicted: boolean;
    /** Side-by-side lane when blocks overlap (a conflict), else 0 of 1. */
    col: number;
    colCount: number;
  };

  /** Give overlapping blocks their own lanes so neither hides the other. */
  function layoutLanes(items: GridBlock[]) {
    const sorted = [...items].sort(
      (a, b) => a.startMin - b.startMin || a.endMin - b.endMin,
    );
    let cluster: GridBlock[] = [];
    let laneEnds: number[] = [];
    let clusterEnd = -1;
    const flush = () => {
      for (const item of cluster) item.colCount = laneEnds.length;
      cluster = [];
      laneEnds = [];
    };
    for (const item of sorted) {
      if (item.startMin >= clusterEnd) flush();
      let lane = laneEnds.findIndex((end) => end <= item.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.endMin);
      } else {
        laneEnds[lane] = item.endMin;
      }
      item.col = lane;
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMin);
    }
    flush();
  }

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
          col: 0,
          colCount: 1,
        });
      }
    }
    for (const day of byDay) layoutLanes(day);
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
      // The lecture is shared across all of a course's lab offerings, so a ghost
      // at the lecture slot would show the lab key ("C-4L") over the lecture and
      // repeat for every offering. When an offering has a distinguishing lab/
      // recit, ghost only that; keep the lecture ghost for lecture-only offerings.
      const hasDistinguishing = offering.sections.some(
        (r) => (r.type ?? "").trim().toUpperCase() !== "LEC",
      );
      for (const row of offering.sections) {
        if (
          hasDistinguishing &&
          (row.type ?? "").trim().toUpperCase() === "LEC"
        ) {
          continue;
        }
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

  const hasGhostTargets = $derived(
    ghostBlocksByDay.some((dayGhosts) => dayGhosts.length > 0),
  );
  const alternativesLoading = $derived(
    !!drag && !resolvedAlternativeCourses.includes(drag.courseCode),
  );

  function ghostAtPoint(x: number, y: number): string | null {
    return (
      document
        .elementFromPoint(x, y)
        ?.closest<HTMLElement>("[data-ghost]")
        ?.dataset.ghost ?? null
    );
  }

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
    // touch-action changes are ignored mid-gesture: once the finger moves the
    // browser pans the grid and fires pointercancel, killing the drag. Cancel
    // the pan directly with a non-passive touchmove preventer instead.
    el.addEventListener("touchmove", preventTouchScroll, { passive: false });
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // capture unsupported — pointer events still bubble to the element
    }
  }

  function preventTouchScroll(e: TouchEvent) {
    e.preventDefault();
  }

  function cleanup() {
    if (longPress) clearTimeout(longPress);
    longPress = null;
    if (pending && pointerId !== null) {
      pending.el.style.touchAction = "";
      pending.el.removeEventListener("touchmove", preventTouchScroll);
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
    // Capture on press, before the movement threshold. Otherwise a quick
    // pointer can leave a short timetable block before its first move handler
    // gets to start the drag, so the gesture silently becomes a no-op.
    try {
      pending.el.setPointerCapture(e.pointerId);
    } catch {
      // capture unsupported — move/up events still bubble while in the block
    }
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
    hoverGhost = ghostAtPoint(e.clientX, e.clientY);
  }

  function onBlockPointerUp(e: PointerEvent) {
    if (pointerId === null || e.pointerId !== pointerId) return;
    // The first move starts the drag and renders its ghosts. A quick mouse
    // gesture can then release directly over a ghost before a second move has
    // updated hoverGhost, so resolve the final pointer position again here.
    const targetGhost = ghostAtPoint(e.clientX, e.clientY) ?? hoverGhost;
    if (drag && targetGhost) {
      const target = alternativeOfferings(
        alternatives,
        drag.courseCode,
        drag.fromSection,
      ).find((o) => o.section === targetGhost);
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

  const topPct = (min: number) => ((min - START_HOUR * 60) / TOTAL_MIN) * 100;
  const heightPct = (startMin: number, endMin: number) =>
    ((endMin - startMin) / TOTAL_MIN) * 100;
</script>

<div>
  <div class="planner-legend" aria-label="Block colors">
    <span class="planner-legend__item">
      <span
        class="planner-legend__dot"
        style:background-color={getPlannerBlockColor("LEC")}
      ></span>
      Lecture
    </span>
    <span class="planner-legend__item">
      <span
        class="planner-legend__dot"
        style:background-color={getPlannerBlockColor("LAB")}
      ></span>
      Lab
    </span>
    <span class="planner-legend__item">
      <span
        class="planner-legend__dot"
        style:background-color={getPlannerBlockColor("RCT")}
      ></span>
      Recitation
    </span>
  </div>

  {#if overflows}
    <p class="planner-grid__scroll-hint" aria-hidden="true">
      Swipe for more days →
    </p>
  {/if}
  <p class="planner-grid__drag-hint" role="note">
    Tap a class for details. Hold and drag it onto a dashed section to switch.
  </p>
  <div
    class="planner-grid-scroll"
    class:planner-grid-scroll--overflow={overflows}
    bind:clientWidth={scrollWidth}
  >
    <div
      class="planner-grid"
      class:planner-grid--dragging={drag}
      style:--days={dayCount}
      style:--hours={END_HOUR - START_HOUR}
      bind:offsetWidth={gridWidth}
    >
      <div class="planner-grid__time" aria-hidden="true">
        {#each HOURS as hour (hour)}
          <div class="planner-grid__hour">{hourLabel(hour)}</div>
        {/each}
      </div>
      {#each DAYS.slice(0, dayCount) as day, dayIndex (day)}
        <div class="planner-grid__day">
          <div class="planner-grid__day-label">{day}</div>
          <div class="planner-grid__day-body">
            {#each blocksByDay[dayIndex] as block (block.key)}
              <div
                class="planner-block"
                class:planner-block--conflict={block.conflicted}
                class:planner-block--lane={block.colCount > 1}
                class:planner-block--selected={selectedKey === block.key}
                class:planner-block--dragging={drag?.fromKey === block.key}
                style:top="{topPct(block.startMin)}%"
                style:height="{heightPct(block.startMin, block.endMin)}%"
                style:left="calc({(block.col / block.colCount) * 100}% + 1px)"
                style:width="calc({100 / block.colCount}% - 2px)"
                style:background-color={getPlannerBlockColor(block.type)}
              >
                <button
                  type="button"
                  class="planner-block__label"
                  aria-label="{block.courseCode} {formatSectionType(
                    block.type,
                  )} · {block.section}"
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
                    {formatSectionType(block.type)} · {block.section}
                  </span>
                </button>
                {#if selectedKey === block.key}
                  <div
                    class="planner-block__actions"
                    class:planner-block__actions--end={dayIndex >= 3}
                  >
                    <p class="planner-block__detail">
                      <strong>{block.courseCode}</strong>
                      {formatSectionType(block.type)}
                      {block.section}
                      {#if block.conflicted}
                        <span class="planner-block__conflict">Conflict</span>
                      {/if}
                      <br />
                      {DAY_NAMES[block.dayIndex]}
                      {formatMinutesRange(block.startMin, block.endMin)}{block.roomCode
                        ? ` · ${block.roomCode}`
                        : ""}
                    </p>
                    <div class="planner-block__buttons">
                      <button
                        type="button"
                        onclick={() =>
                          onremove(block.courseCode, block.section)}
                      >
                        Remove
                      </button>
                      {#if block.roomCode}
                        <button
                          type="button"
                          onclick={() => onopenroom(block.roomCode ?? "")}
                        >
                          Open room
                        </button>
                      {/if}
                    </div>
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
</div>

{#if drag && pointerPos}
  <div
    class="planner-drag-pill"
    style:left="{pointerPos.x}px"
    style:top="{pointerPos.y}px"
    aria-hidden="true"
  >
    {drag.courseCode}
    {#if hoverGhost}
      → {hoverGhost}
    {:else if alternativesLoading}
      · loading other sections…
    {:else if !hasGhostTargets}
      · no scheduled alternate section
    {:else}
      · drop on a section
    {/if}
  </div>
{/if}

<style>
  .planner-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
    padding: 0.375rem 0.125rem;
    font-size: 0.75rem;
    color: var(--theme-text-2, hsl(0, 0%, 35%));
  }

  /* Mobile-only affordance that the week grid scrolls sideways (hidden on
     desktop, where all six days already fit). */
  .planner-grid__scroll-hint {
    display: none;
    align-items: center;
    justify-content: flex-end;
    margin: 0;
    padding: 0 0.125rem 0.375rem;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
    font-size: 0.75rem;
    font-weight: 600;
  }

  .planner-grid__drag-hint {
    margin: 0;
    padding: 0 0.125rem 0.375rem;
    color: var(--theme-text-2, hsl(0, 0%, 35%));
    font-size: 0.75rem;
  }

  .planner-legend__item {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-weight: 600;
  }

  .planner-legend__dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 0.1875rem;
    flex: 0 0 auto;
  }

  .planner-grid-scroll--overflow {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* clip, not hidden: hidden makes a scroll container and breaks the sticky
     day header and hour column. */
  .planner-grid {
    display: grid;
    grid-template-columns: 3rem repeat(var(--days, 6), minmax(4.5rem, 1fr));
    border: 1px solid var(--theme-border, hsl(0, 0%, 88%));
    border-radius: 0.5rem;
    background: var(--theme-surface, white);
    overflow: clip;
  }

  .planner-grid__time {
    position: sticky;
    left: 0;
    z-index: 7;
    display: flex;
    flex-direction: column;
    padding-top: 1.5rem;
    background: var(--theme-accent-fill, hsl(5, 53%, 28%));
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
    border-left: 1px solid var(--theme-border, hsl(0, 0%, 90%));
    min-width: 0;
  }

  /* -0.625rem cancels the planner body's top padding so the header sits
     flush against the tabs instead of floating with a gap above it. */
  .planner-grid__day-label {
    position: sticky;
    top: -0.625rem;
    z-index: 6;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--theme-accent-fill, hsl(5, 53%, 32%));
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .planner-grid__day-body {
    position: relative;
    height: calc(var(--hours, 13) * 2.5rem);
    background-image: repeating-linear-gradient(
      to bottom,
      transparent,
      transparent calc(2.5rem - 1px),
      var(--theme-border, hsl(0, 0%, 93%)) calc(2.5rem - 1px),
      var(--theme-border, hsl(0, 0%, 93%)) 2.5rem
    );
  }

  .planner-block {
    position: absolute;
    /* left/width are inline so overlapping blocks share the column. */
    box-sizing: border-box;
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
    outline: 2px solid var(--theme-accent-text, hsl(0, 85%, 45%));
    outline-offset: -2px;
  }

  .planner-block--selected {
    z-index: 2;
    overflow: visible;
  }

  /* Side-by-side (conflicting) blocks are narrow: give the course code all
     the room; the tap card and the Sections panel carry the rest. */
  .planner-block--lane .planner-block__label {
    padding-inline: 0.125rem;
  }

  .planner-block--lane .planner-block__section {
    display: none;
  }

  .planner-block--lane .planner-block__course {
    overflow-wrap: anywhere;
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
    /* Long-press starts a drag; don't let iOS select text or show the callout. */
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }

  .planner-block__label:focus-visible {
    outline: 2px solid white;
    outline-offset: -2px;
  }

  /* A phone column is ~60px: wrap "CMSC 12" onto two lines at the space
     instead of clipping it to "CMS…" (Jakob audit, micro 14). */
  .planner-block__course {
    display: block;
    font-size: 0.6875rem;
    font-weight: 700;
    line-height: 1.15;
    overflow-wrap: break-word;
  }

  .planner-block__section {
    display: block;
    margin-top: 0.0625rem;
    font-size: 0.5625rem;
    line-height: 1.15;
    overflow-wrap: anywhere;
    opacity: 0.9;
  }

  .planner-block__actions {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 3;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: max-content;
    max-width: 14rem;
    padding: 0.375rem;
    background: var(--theme-surface, white);
    border: 1px solid var(--theme-border, hsl(0, 0%, 85%));
    border-radius: 0.375rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  /* Thu-Sat: open toward the left so the card stays on screen. */
  .planner-block__actions--end {
    left: auto;
    right: 0;
  }

  .planner-block__detail {
    margin: 0;
    padding: 0 0.25rem;
    font-size: 0.75rem;
    line-height: 1.4;
    color: var(--theme-text, hsl(0, 0%, 25%));
  }

  .planner-block__conflict {
    margin-left: 0.25rem;
    padding: 0 0.375rem;
    border-radius: 999px;
    background: var(--theme-accent-soft, hsl(0, 85%, 95%));
    color: var(--theme-accent-text, hsl(0, 85%, 35%));
    font-weight: 700;
  }

  .planner-block__buttons {
    display: flex;
    gap: 0.25rem;
  }

  .planner-block__actions button {
    all: unset;
    box-sizing: border-box;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    cursor: pointer;
  }

  .planner-block__actions button:hover,
  .planner-block__actions button:focus-visible {
    background: var(--theme-accent-soft, hsl(5, 53%, 96%));
  }

  .planner-ghost {
    position: absolute;
    /* left/width are set inline so same-slot ghosts tile into columns. */
    box-sizing: border-box;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed var(--theme-border-strong, hsl(0, 0%, 55%));
    border-radius: 0.25rem;
    background: var(--theme-surface-translucent, hsl(0, 0%, 100%, 0.55));
    color: var(--theme-text, hsl(0, 0%, 25%));
    cursor: copy;
  }

  .planner-ghost--hover {
    background: var(--theme-surface-translucent, hsl(140, 60%, 92%, 0.9));
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

  /* Short viewports scroll the whole planner screen (no padding there). */
  @media (max-height: 30rem) {
    .planner-grid__day-label {
      top: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .planner-ghost {
      transition: none;
    }
  }

  /* --- Mobile (phones): bigger text, taller rows, wider day columns, and a
     horizontally-scrollable week grid instead of a squeezed six-up view. --- */
  @media (max-width: 640px) {
    .planner-legend {
      gap: 0.375rem 1.25rem;
      font-size: 0.8125rem;
    }

    .planner-legend__dot {
      width: 0.875rem;
      height: 0.875rem;
    }

    .planner-grid__scroll-hint {
      display: flex;
    }

    /* Mon-Fri fit a 375-390px phone; Saturday or a 320px screen scrolls. */
    .planner-grid {
      grid-template-columns: 2.75rem repeat(var(--days, 6), minmax(3.75rem, 1fr));
    }

    /* Taller rows use the phone's vertical space and give a 1-hour block a
       3rem (48px) height — above the 44px tap-target minimum. */
    .planner-grid__day-body {
      height: calc(var(--hours, 13) * 3rem);
      background-image: repeating-linear-gradient(
        to bottom,
        transparent,
        transparent calc(3rem - 1px),
        var(--theme-border, hsl(0, 0%, 93%)) calc(3rem - 1px),
        var(--theme-border, hsl(0, 0%, 93%)) 3rem
      );
    }

    .planner-grid__day-label {
      font-size: 0.875rem;
    }

    .planner-grid__hour {
      font-size: 0.75rem;
    }

    .planner-block__label {
      padding: 0.25rem 0.375rem;
    }

    .planner-block__course {
      font-size: 0.8125rem;
    }

    .planner-block__section {
      font-size: 0.75rem;
    }

    .planner-block__actions {
      gap: 0.375rem;
      padding: 0.375rem;
    }

    .planner-block__detail {
      font-size: 0.8125rem;
    }

    .planner-block__actions button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2.5rem;
      padding: 0.5rem 0.875rem;
      font-size: 0.875rem;
    }
  }
</style>
