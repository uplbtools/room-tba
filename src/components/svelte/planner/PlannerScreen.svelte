<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import Share2 from "@lucide/svelte/icons/share-2";
  import ImageDown from "@lucide/svelte/icons/image-down";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Copy from "@lucide/svelte/icons/copy";
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import { fly } from "svelte/transition";
  import { trapFocus } from "@lib/focus-trap";
  import { fullScreenDismiss, fullScreenReveal } from "@lib/motion";
  import {
    adminAuthStore,
    plannerStore,
    queryStore,
    sidebarStore,
    termStore,
    toastStore,
  } from "@lib/store.svelte";
  import { fetchAllClasses } from "@lib/classes-api";
  import { COURSE_CHANGE_DISCLAIMER } from "@lib/amis/room-scheduled-types";
  import { changeOfMatriculationLabel } from "@lib/term-calendar";
  import { fetchFinalExams, FINALS_SCOPE_NOTE } from "@lib/final-exams";
  import { isUnscheduled } from "@lib/planner/conflicts";
  import { buildPlanIcs } from "@lib/planner/ics";
  import { renderPlanToPng } from "@lib/planner/plan-image";
  import { encodeSharePlan } from "@lib/planner/share-codec";
  import FinalExamsList from "@ui/room/FinalExamsList.svelte";
  import TermSelector from "@ui/TermSelector.svelte";
  import GoogleCalendarIcon from "@ui/icons/GoogleCalendarIcon.svelte";
  import PlannerCourseSearch from "./PlannerCourseSearch.svelte";
  import PlannerGrid from "./PlannerGrid.svelte";
  import type { ClassMapValue, FinalExamRow } from "@lib/types";
  import { tick } from "svelte";
  import { MediaQuery } from "svelte/reactivity";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  let screenEl = $state<HTMLDivElement | null>(null);
  let finals = $state<FinalExamRow[]>([]);
  let courseRows = $state<ClassMapValue[]>([]);
  let resolvedAlternativeCourses = $state<string[]>([]);
  let lastRefreshKey = $state<string | null>(null);
  // Monotonic id so an out-of-order fetch (older, fewer courses) can't overwrite
  // a newer one and wrongly flag just-added sections as "no longer offered".
  let refreshSeq = 0;

  const plan = $derived(plannerStore.activePlan);
  const offerings = $derived.by(() => {
    const seen = new Map<
      string,
      { courseCode: string; section: string; titles: string[] }
    >();
    for (const s of plan?.sections ?? []) {
      const key = `${s.courseCode}::${s.section}`;
      if (!seen.has(key)) {
        seen.set(key, {
          courseCode: s.courseCode,
          section: s.section,
          titles: [],
        });
      }
      if (s.courseTitle) seen.get(key)?.titles.push(s.courseTitle);
    }
    return [...seen.values()];
  });
  // Group a course's components (LEC + its lab/recit) so the list visually
  // links them as one enrollment unit. Excludes stale rows (shown separately).
  const courseGroups = $derived.by(() => {
    const byCourse = new Map<
      string,
      {
        courseCode: string;
        title: string | null;
        sections: (typeof plan)["sections"];
      }
    >();
    for (const s of plan?.sections ?? []) {
      if (s.stale) continue;
      let g = byCourse.get(s.courseCode);
      if (!g) {
        g = {
          courseCode: s.courseCode,
          title: s.courseTitle ?? null,
          sections: [],
        };
        byCourse.set(s.courseCode, g);
      }
      if (!g.title && s.courseTitle) g.title = s.courseTitle;
      g.sections.push(s);
    }
    for (const g of byCourse.values()) {
      g.sections.sort(
        (a, b) => (a.type === "LEC" ? 0 : 1) - (b.type === "LEC" ? 0 : 1),
      );
    }
    return [...byCourse.values()];
  });

  const unscheduled = $derived(
    (plan?.sections ?? []).filter((s) => !s.stale && isUnscheduled(s)),
  );
  const staleSections = $derived((plan?.sections ?? []).filter((s) => s.stale));
  const planFinals = $derived.by(() => {
    const sectionsByCourse = new Map<string, Set<string>>();
    for (const s of plan?.sections ?? []) {
      if (!sectionsByCourse.has(s.courseCode)) {
        sectionsByCourse.set(s.courseCode, new Set());
      }
      sectionsByCourse.get(s.courseCode)?.add(s.section);
    }
    return finals.filter(
      (exam) =>
        sectionsByCourse.has(exam.courseCode) &&
        (!exam.section ||
          sectionsByCourse.get(exam.courseCode)?.has(exam.section)),
    );
  });

  function swapSection(courseCode: string, toSections: ClassMapValue[]) {
    plannerStore.replaceCourse(courseCode, toSections);
  }

  // The store's open/close was removed (babff7b) - the screen now mounts only
  // while the sidebar's planner panel is active, so closing = back to the map.
  function close() {
    sidebarStore.changeOpened("map");
  }

  function openRoom(roomCode: string) {
    if (!roomCode) return;
    queryStore.updateQuery({
      type: "result",
      category: "room",
      value: roomCode,
    });
    queryStore.inputValue = roomCode;
    close();
  }

  async function copyShareLink() {
    if (!plan || !hasSchedule) return;
    const url = `${location.origin}/?plan=${encodeSharePlan(plan)}`;
    try {
      await navigator.clipboard.writeText(url);
      toastStore.show("Share link copied", "success");
    } catch {
      toastStore.show("Could not copy the link", "error");
    }
  }

  function downloadIcs() {
    if (!plan || !hasSchedule) return;
    const term = termStore.activeTerm;
    const ics = buildPlanIcs(
      plan,
      term ? { startsOn: term.startsOn, endsOn: term.endsOn } : null,
    );
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${planFileSlug(plan.label)}-${plan.termId}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  let exportingImage = $state(false);

  async function saveAsImage() {
    if (!plan || !hasSchedule || exportingImage) return;
    exportingImage = true;
    try {
      const blob = await renderPlanToPng(plan, {
        termLabel: termStore.activeTerm?.label ?? null,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${planFileSlug(plan.label)}-${plan.termId}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toastStore.show("Could not create the image", "error");
    } finally {
      exportingImage = false;
    }
  }

  function planFileSlug(label: string): string {
    return (
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "plan"
    );
  }

  // Share / calendar / image only make sense once something is scheduled; the
  // buttons stay visible but disabled before then so the affordance is known.
  const hasSchedule = $derived(
    (plan?.sections ?? []).some((s) => !s.stale && !isUnscheduled(s)),
  );

  // --- Rename -------------------------------------------------------------
  let renaming = $state(false);
  let renameDraft = $state("");

  async function startRename(tabPlan?: { id: string; label: string }) {
    const target = tabPlan ?? plan;
    if (!target) return;
    if (plan?.id !== target.id) {
      plannerStore.selectPlan(target.id);
      // Plan-switch effect clears renaming; wait a tick before enabling it.
      await tick();
    }
    renameDraft = target.label;
    renaming = true;
  }

  function commitRename() {
    if (!plan) return;
    plannerStore.renamePlan(plan.id, renameDraft);
    renaming = false;
  }

  function onRenameKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") commitRename();
    else if (event.key === "Escape") renaming = false;
  }

  // Focus + select the rename field the moment it appears.
  function autofocus(node: HTMLInputElement) {
    node.focus();
  }

  // Switching plans cancels an in-progress rename.
  $effect(() => {
    void plan?.id;
    renaming = false;
  });

  // Never leave the active term with zero plans — empty chrome is unusable.
  $effect(() => {
    void plannerStore.activeTermId;
    void plannerStore.plansForTerm.length;
    plannerStore.ensurePlanForActiveTerm();
  });

  $effect(() => {
    if (!screenEl) return;
    return trapFocus(screenEl, { onEscape: close });
  });

  // Re-resolve natural keys and load finals once per plan per open (#planner).
  // No `open` gate: the component only exists while the planner panel is open.
  $effect(() => {
    if (!plan || plan.sections.length === 0) return;
    // Key on the course set too: adding a course to the plan must refetch its
    // sections, otherwise dragging a newly added block has no alternatives to
    // drop onto (drag "doesn't work" for just-added courses).
    const courseCodes = [
      ...new Set(plan.sections.map((s) => s.courseCode)),
    ].sort();
    const refreshKey = `${plan.id}::${plan.termId}::${courseCodes.join(",")}`;
    if (refreshKey === lastRefreshKey) return;
    lastRefreshKey = refreshKey;
    courseRows = [];
    resolvedAlternativeCourses = [];

    const seq = ++refreshSeq;
    Promise.all(
      courseCodes.map((code) =>
        // fetchAllClasses (not a single 100-cap page) so a big course like
        // HK 12 (147 sections) surfaces every drag alternative, not just 100.
        fetchAllClasses({
          termId: plan.termId,
          courseCodePrefix: code,
        }).then(
          (page) => ({ code, rows: page.rows, ok: true }),
          () => ({ code, rows: [] as ClassMapValue[], ok: false }),
        ),
      ),
    ).then((results) => {
      if (seq !== refreshSeq) return; // superseded by a newer refresh
      const okResults = results.filter((r) => r.ok);
      const rows = okResults.flatMap((r) => r.rows);
      const fetchedCourses = new Set(okResults.map((r) => r.code));
      courseRows = rows;
      // A failed lookup is resolved too: the grid should say that no alternate
      // section is available, rather than leaving a permanent loading state.
      resolvedAlternativeCourses = results.map((r) => r.code);
      if (fetchedCourses.size > 0) {
        plannerStore.refreshActivePlan(rows, fetchedCourses);
      }
    });

    Promise.all(
      courseCodes.map((code) =>
        fetchFinalExams({ courseCode: code, termId: plan.termId }).catch(
          () => [],
        ),
      ),
    ).then((results) => {
      finals = results.flat();
    });
  });
</script>

<div
  bind:this={screenEl}
  class="planner-screen"
  role="dialog"
  aria-modal="true"
  aria-labelledby="planner-screen-title"
  in:fly={fullScreenReveal(reducedMotion.current)}
>
  <header class="planner-header">
    <button
      type="button"
      class="planner-back"
      onclick={close}
      aria-label="Back to map"
      title="Back to map"
    >
      <ChevronLeft size={18} aria-hidden="true" />
      <span>Back to map</span>
    </button>
    <h1 class="planner-title" id="planner-screen-title">Class Planner</h1>
    {#if termStore.terms.length > 0}
      <TermSelector variant="chip" />
    {/if}
    {#if plan}
      <button
        type="button"
        class="planner-action"
        onclick={copyShareLink}
        disabled={!hasSchedule}
        aria-label="Share plan"
        title={hasSchedule
          ? "Copy a link that reopens this plan"
          : "Add a scheduled class first"}
      >
        <Share2 size={15} aria-hidden="true" />
        <span class="planner-action__label">Share</span>
      </button>
      <button
        type="button"
        class="planner-action"
        onclick={downloadIcs}
        disabled={!hasSchedule}
        aria-label="Add to Google Calendar"
        title={hasSchedule
          ? "Downloads an .ics file you can import into Google Calendar, Apple Calendar, or Outlook"
          : "Add a scheduled class first"}
      >
        <GoogleCalendarIcon size={15} />
        <span class="planner-action__label">Add to Google Calendar</span>
      </button>
      <button
        type="button"
        class="planner-action"
        onclick={saveAsImage}
        disabled={!hasSchedule || exportingImage}
        aria-label="Save image"
        title={hasSchedule
          ? "Download the timetable as an image"
          : "Add a scheduled class first"}
      >
        <ImageDown size={15} aria-hidden="true" />
        <span class="planner-action__label">
          {exportingImage ? "Saving…" : "Save image"}
        </span>
      </button>
    {/if}
  </header>

  <p class="planner-disclaimer" role="note">
    {COURSE_CHANGE_DISCLAIMER}{changeOfMatriculationLabel(
      termStore.activeTermId,
    )
      ? ` (${changeOfMatriculationLabel(termStore.activeTermId)})`
      : ""}
  </p>

  <div class="planner-tabs" role="tablist" aria-label="Plans">
    {#each plannerStore.plansForTerm as tabPlan (tabPlan.id)}
      <div
        class="planner-tab-item"
        class:planner-tab-item--active={tabPlan.id === plan?.id}
      >
        {#if renaming && tabPlan.id === plan?.id}
          <input
            class="planner-tab planner-tab--rename"
            bind:value={renameDraft}
            onkeydown={onRenameKeydown}
            onblur={commitRename}
            use:autofocus
            aria-label="Rename plan"
            maxlength="40"
          />
        {:else}
          <button
            type="button"
            role="tab"
            class="planner-tab"
            aria-selected={tabPlan.id === plan?.id}
            onclick={() => plannerStore.selectPlan(tabPlan.id)}
            ondblclick={() => startRename(tabPlan)}
          >
            <span class="planner-tab__name">{tabPlan.label}</span>
          </button>
          <div class="planner-tab__actions">
            <button
              type="button"
              class="planner-tab__action"
              onclick={() => startRename(tabPlan)}
              aria-label="Rename {tabPlan.label}"
              title="Rename"
            >
              <Pencil size={12} aria-hidden="true" />
            </button>
            <button
              type="button"
              class="planner-tab__action"
              onclick={() => plannerStore.duplicatePlan(tabPlan.id)}
              aria-label="Duplicate {tabPlan.label}"
              title="Duplicate"
            >
              <Copy size={12} aria-hidden="true" />
            </button>
            <button
              type="button"
              class="planner-tab__action planner-tab__action--danger"
              onclick={() => plannerStore.deletePlan(tabPlan.id)}
              aria-label="Delete {tabPlan.label}"
              title="Delete"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        {/if}
      </div>
    {/each}
    <div class="planner-tab__tools">
      <button
        type="button"
        class="planner-tab__tool--new"
        onclick={() => plannerStore.createPlan()}
        aria-label="New plan"
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  </div>

  <p class="planner-save-note" role="note">
    {#if adminAuthStore.isLoggedIn}
      Plans and professor notes save automatically on this device and sync to
      your account.
    {:else}
      Plans save automatically on this device. Sign in to keep your plans across
      devices. Use <strong>Share</strong> to copy a link you can reopen anywhere or
      send to someone.
    {/if}
  </p>

  <div
    class="planner-body"
    class:planner-body--no-side={!plan || plan.sections.length === 0}
  >
    <PlannerCourseSearch />

    <PlannerGrid
      sections={plan?.sections ?? []}
      conflicts={plannerStore.conflicts}
      alternatives={courseRows}
      {resolvedAlternativeCourses}
      onremove={plannerStore.removeOffering}
      onopenroom={openRoom}
      onswap={swapSection}
    />

    {#if plan && plan.sections.length > 0}
      <section class="planner-side" aria-label="Plan details">
        <h2 class="planner-side__heading">
          Sections ({offerings.length})
          {#if plannerStore.conflicts.length > 0}
            <span class="planner-conflict-badge" role="status">
              {plannerStore.conflicts.length} conflict{plannerStore.conflicts
                .length === 1
                ? ""
                : "s"}
            </span>
          {:else if plan && plan.sections.length > 0}
            <span
              class="planner-conflict-badge planner-conflict-badge--clear"
              role="status"
            >
              All clear
            </span>
          {/if}
        </h2>
        <p class="planner-side__hint" role="note">
          Room TBA cannot show instructor names from AMIS. Write the professor
          for each section here — saved to your account when signed in, never
          shared.
        </p>
        <ul class="planner-offerings">
          {#each courseGroups as group (group.courseCode)}
            <li class="planner-offering planner-offering--group">
              <div class="planner-offering__head">
                <div class="planner-offering__main">
                  <span class="planner-offering__course">
                    {group.courseCode}
                  </span>
                  {#if group.title}
                    <span class="planner-offering__title">{group.title}</span>
                  {/if}
                </div>
                <button
                  type="button"
                  class="planner-offering__remove"
                  onclick={() =>
                    plannerStore.removeOffering(
                      group.courseCode,
                      group.sections[0]?.section ?? "",
                    )}
                >
                  Remove
                </button>
              </div>
              <ul class="planner-offering__parts">
                {#each group.sections as s (s.type + s.section)}
                  <li
                    class="planner-offering__part planner-offering__part--with-note"
                  >
                    <div class="planner-offering__part-head">
                      <span class="planner-offering__part-type">
                        {s.type ?? "Class"}
                      </span>
                      <span class="planner-offering__part-section">
                        {s.section}
                      </span>
                    </div>
                    <input
                      type="text"
                      class="planner-offering__part-note"
                      placeholder="Professor (e.g. Dr. Santos)"
                      aria-label="Professor for {group.courseCode} {s.type} {s.section}"
                      value={s.note ?? ""}
                      oninput={(e) =>
                        plannerStore.updateSectionNote(
                          s.courseCode,
                          s.section,
                          s.type ?? "Class",
                          e.currentTarget.value,
                        )}
                    />
                  </li>
                {/each}
              </ul>
            </li>
          {/each}
        </ul>

        {#if unscheduled.length > 0}
          <h2 class="planner-side__heading">Unscheduled (TBA)</h2>
          <ul class="planner-plain-list">
            {#each unscheduled as s (s.courseCode + s.section + s.type)}
              <li>{s.courseCode} {s.type} · {s.section}</li>
            {/each}
          </ul>
        {/if}

        {#if staleSections.length > 0}
          <h2 class="planner-side__heading">No longer offered</h2>
          <ul class="planner-plain-list planner-plain-list--stale">
            {#each staleSections as s (s.courseCode + s.section + s.type)}
              <li>{s.courseCode} {s.type} · {s.section}</li>
            {/each}
          </ul>
        {/if}

        {#if planFinals.length > 0}
          <h2 class="planner-side__heading">Final exams</h2>
          <FinalExamsList exams={planFinals} showRoom={true} />
          <p class="planner-finals-note">{FINALS_SCOPE_NOTE}</p>
        {/if}
      </section>
    {/if}
  </div>
</div>

<style>
  .planner-screen {
    /* Shrinkable (flex 1 1) + min-width 0: the .ui-layer parent is a row flex
       pinned to the viewport, so a shrink-0 child inherits its widest row's
       min-content width and pushes the page sideways on phones. Inner rows
       (tabs, week grid) own their horizontal scrolling; the root never does. */
    flex: 1 1 auto;
    min-width: 0;
    max-width: 100%;
    overflow-x: clip;
    display: flex;
    flex-direction: column;
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    pointer-events: auto;
  }

  .planner-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    padding: calc(env(safe-area-inset-top, 0px) + 0.375rem) 0.625rem 0.375rem;
    border-bottom: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
  }

  /* The chip ships flex: 0 0 auto; let it shrink here (its label already
     ellipsizes) so the header row fits 320-375px without clipping actions. */
  .planner-header :global(.term-filter-chip) {
    flex-shrink: 1;
  }

  .planner-back {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 0.125rem;
    min-height: 2rem;
    padding: 0.25rem 0.375rem 0.25rem 0.125rem;
    border-radius: 0.5rem;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    touch-action: manipulation;
  }

  .planner-back:hover,
  .planner-back:focus-visible {
    background-color: hsl(5, 53%, 96%);
  }

  .planner-back:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .planner-title {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    font-size: 0.9375rem;
    font-weight: 700;
    line-height: 1.2;
    color: hsl(0, 0%, 15%);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .planner-action {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    flex: 0 0 auto;
    padding: 0.375rem 0.625rem;
    border: 1px solid hsl(5, 53%, 82%);
    border-radius: 999px;
    background: white;
    color: hsl(5, 53%, 32%);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }

  .planner-action:hover:not(:disabled),
  .planner-action:focus-visible:not(:disabled) {
    background: hsl(5, 53%, 96%);
  }

  .planner-action:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    border-color: hsl(0, 0%, 82%);
    color: hsl(0, 0%, 55%);
  }

  .planner-disclaimer {
    flex-shrink: 0;
    margin: 0;
    padding: 0.4375rem 0.75rem;
    background: hsl(38, 92%, 95%);
    border-bottom: 1px solid hsl(38, 70%, 85%);
    color: hsl(32, 60%, 30%);
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.35;
  }

  .planner-save-note {
    flex-shrink: 0;
    margin: 0;
    padding: 0.375rem 0.75rem;
    color: hsl(0, 0%, 42%);
    font-size: 0.75rem;
    line-height: 1.35;
  }

  .planner-save-note strong {
    color: hsl(5, 53%, 32%);
  }

  .planner-tabs {
    display: flex;
    flex-shrink: 0;
    gap: 0.125rem;
    padding-top: 0.25rem;
    border-bottom: 1px solid hsl(0, 0%, 86%);
    background: hsl(0, 0%, 94%);
    overflow-x: auto;
  }

  /* Prefer a fixed tab width; flex-shrink compresses when the row is tight. */
  .planner-tab-item {
    display: flex;
    align-items: stretch;
    flex: 0 1 13rem;
    width: 13rem;
    min-width: 7.5rem;
    max-width: 13rem;
    border: 1px solid transparent;
    border-bottom: none;
    border-radius: 0.5rem 0.5rem 0 0;
    background: transparent;
    color: hsl(0, 0%, 35%);
  }

  .planner-tab-item:hover {
    background: hsl(0, 0%, 98%);
    color: hsl(5, 53%, 28%);
  }

  .planner-tab-item--active {
    position: relative;
    z-index: 1;
    margin-bottom: -1px;
    border-color: hsl(0, 0%, 86%);
    background: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    color: hsl(5, 53%, 28%);
  }

  .planner-tab-item--active:hover {
    background: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    color: hsl(5, 53%, 28%);
  }

  .planner-tab {
    all: unset;
    box-sizing: border-box;
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    min-width: 0;
    padding: 0.5rem 0.25rem 0.5rem 0.75rem;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 600;
    color: inherit;
    cursor: pointer;
  }

  .planner-tab:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: -2px;
  }

  .planner-tab__name {
    display: block;
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .planner-tab__actions {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    align-self: center;
    gap: 0.05rem;
    padding-inline-end: 0.25rem;
  }

  .planner-tab__action {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 999px;
    color: inherit;
    cursor: pointer;
  }

  .planner-tab__action:hover,
  .planner-tab__action:focus-visible {
    background: hsl(5, 30%, 90%);
    color: hsl(5, 53%, 28%);
  }

  .planner-tab__action--danger:hover,
  .planner-tab__action--danger:focus-visible {
    background: hsl(0, 60%, 92%);
    color: hsl(0, 60%, 32%);
  }

  .planner-tab__action:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .planner-tab--rename {
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
    margin: 0;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 0.5rem 0.5rem 0 0;
    background: white;
    color: hsl(0, 0%, 15%);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    text-align: left;
    box-shadow: inset 0 0 0 1px hsl(5, 53%, 50%);
  }

  .planner-tab-item:has(.planner-tab--rename) {
    border-color: hsl(5, 53%, 50%);
    background: white;
  }

  .planner-tab__tool--new {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    border: 1px solid transparent;
    border-radius: 1rem;
    cursor: pointer;
    font: inherit;
    color: inherit;
  }

  .planner-tab__tool--new:hover,
  .planner-tab__tool--new:focus-visible {
    border-color: hsl(5, 53%, 55%);
    background: hsl(5, 53%, 97%);
  }

  .planner-tab__tool--new:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .planner-tab__tools {
    display: flex;
    flex: 0 0 auto;
    align-self: stretch;
    align-items: center;
    font-size: 0.75rem;
    gap: 0.5rem;
    padding-left: 0.5rem;
  }

  .planner-conflict-badge {
    margin-left: auto;
    flex: 0 0 auto;
    align-self: center;
    margin-inline-end: 0.25rem;
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    background: hsl(0, 85%, 95%);
    color: hsl(0, 85%, 35%);
    font-size: 0.75rem;
    font-weight: 700;
  }

  .planner-conflict-badge--clear {
    background: hsl(140, 60%, 94%);
    color: hsl(140, 60%, 25%);
  }

  .planner-body {
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.625rem 0.625rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
    display: grid;
    grid-template-columns: 17rem auto 18rem;
    gap: 0.75rem;
    align-content: start;
    -webkit-overflow-scrolling: touch;
  }

  .planner-body--no-side {
    grid-template-columns: 17rem minmax(auto, 80rem);
  }

  @media (max-width: 48rem) {
    .planner-body,
    .planner-body--no-side {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .planner-side {
    min-width: 0;
  }

  .planner-side__heading {
    margin: 0.75rem 0 0.375rem;
    font-size: 0.8125rem;
    font-weight: 700;
    color: hsl(0, 0%, 25%);
  }

  .planner-side__heading:first-child {
    margin-top: 0;
  }

  .planner-side__hint {
    margin: 0 0 0.5rem;
    font-size: 0.75rem;
    line-height: 1.45;
    color: hsl(0, 0%, 38%);
  }

  .planner-offerings {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .planner-offering {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border: 1px solid hsl(0, 0%, 90%);
    border-radius: 0.5rem;
    background: white;
  }

  .planner-offering--group {
    flex-direction: column;
    align-items: stretch;
    gap: 0.375rem;
  }

  .planner-offering__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  /* Rail visually links a course's lecture + its lab/recit as one unit. */
  .planner-offering__parts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    border-left: 2px solid hsl(5, 40%, 82%);
  }

  .planner-offering__part {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.25rem 0 0.25rem 0.5rem;
    font-size: 0.75rem;
  }

  .planner-offering__part-head {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .planner-offering__part-note {
    width: 100%;
    background: transparent;
    border: none;
    font-size: 0.75rem;
    color: hsl(0, 0%, 40%);
    padding: 0;
    margin: 0;
    font-family: inherit;
  }

  .planner-offering__part-note::placeholder {
    color: hsl(0, 0%, 65%);
    font-style: italic;
  }

  .planner-offering__part-note:focus {
    outline: none;
    color: hsl(0, 0%, 15%);
  }

  .planner-offering__part-type {
    min-width: 2.4rem;
    font-weight: 700;
    color: hsl(5, 53%, 32%);
  }

  .planner-offering__part-section {
    color: hsl(0, 0%, 30%);
  }

  .planner-offering__main {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .planner-offering__course {
    font-size: 0.8125rem;
    font-weight: 700;
    color: hsl(0, 0%, 15%);
  }

  .planner-offering__title {
    font-size: 0.75rem;
    color: hsl(0, 0%, 40%);
    line-height: 1.3;
    /* Show the full course title (its description) - wrap instead of truncate. */
    overflow-wrap: anywhere;
  }

  .planner-offering__remove {
    all: unset;
    flex-shrink: 0;
    padding: 0.25rem 0.5rem;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-weight: 600;
    color: hsl(0, 60%, 40%);
    cursor: pointer;
  }

  .planner-offering__remove:hover,
  .planner-offering__remove:focus-visible {
    background: hsl(0, 60%, 96%);
  }

  .planner-plain-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8125rem;
    color: hsl(0, 0%, 35%);
  }

  .planner-plain-list--stale {
    color: hsl(0, 60%, 40%);
  }

  .planner-finals-note {
    margin: 0.375rem 0 0;
    font-size: 0.6875rem;
    color: hsl(0, 0%, 50%);
  }

  /* 320px: the back chevron + term + actions are the essentials; the plan
     tabs below already identify the screen. Title stays for aria-labelledby. */
  @media (max-width: 400px) {
    .planner-title {
      display: none;
    }
  }

  /* --- Mobile (phones): designed as its own screen, not the desktop clipped.
     One compact header row (icon-only actions), slim tabs, no hint prose -
     the schedule gets the viewport. --- */
  @media (max-width: 640px) {
    .planner-header {
      gap: 0.375rem;
      padding-left: 0.375rem;
      padding-right: 0.5rem;
    }

    /* Icon-only chevron; "Class Planner" beside it already says where you are. */
    .planner-back {
      min-height: 2.5rem;
      padding: 0.25rem;
    }

    .planner-back span {
      display: none;
    }

    .planner-title {
      flex: 0 1 auto;
      font-size: 0.9375rem;
    }

    /* Term selector takes the leftover slack between title and actions. */
    .planner-header :global(.term-filter-chip) {
      margin-left: auto;
    }

    /* Actions collapse to round icon buttons; the label lives in aria/title. */
    .planner-action {
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      padding: 0;
      border-radius: 999px;
    }

    .planner-action__label {
      display: none;
    }

    .planner-disclaimer {
      padding: 0.3125rem 0.625rem;
      font-size: 0.6875rem;
    }

    /* Keep the account-sync and privacy status visible on small screens too. */
    .planner-save-note {
      padding: 0.25rem 0.625rem;
      font-size: 0.6875rem;
    }

    .planner-tabs {
      min-height: 2.75rem;
    }

    .planner-conflict-badge {
      padding: 0.375rem 0.625rem;
      font-size: 0.75rem;
    }

    .planner-body {
      gap: 0.75rem;
      padding: 0.625rem 0.625rem calc(1rem + env(safe-area-inset-bottom, 0px));
    }

    .planner-side__heading {
      font-size: 0.9375rem;
    }

    .planner-offering {
      padding: 0.75rem;
    }

    .planner-offering__course {
      font-size: 0.9375rem;
    }

    .planner-offering__title,
    .planner-offering__part {
      font-size: 0.8125rem;
    }

    /* Obvious, tappable Remove. */
    .planner-offering__remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2.5rem;
      padding: 0.375rem 0.75rem;
      border: 1px solid hsl(0, 60%, 80%);
      font-size: 0.8125rem;
    }

    .planner-plain-list {
      gap: 0.375rem;
      font-size: 0.875rem;
    }

    .planner-finals-note {
      font-size: 0.8125rem;
    }
  }
</style>
