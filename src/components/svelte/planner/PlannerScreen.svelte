<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import { fly } from "svelte/transition";
  import { trapFocus } from "@lib/focus-trap";
  import { fullScreenDismiss, fullScreenReveal } from "@lib/motion";
  import {
    plannerStore,
    queryStore,
    sidePanelStore,
    termStore,
    toastStore,
  } from "@lib/store.svelte";
  import { openBrowseClasses } from "@lib/browse-campus";
  import { fetchClassPage } from "@lib/classes-api";
  import { fetchFinalExams, FINALS_SCOPE_NOTE } from "@lib/final-exams";
  import { isUnscheduled } from "@lib/planner/conflicts";
  import { buildPlanIcs } from "@lib/planner/ics";
  import { encodeSharePlan } from "@lib/planner/share-codec";
  import FinalExamsList from "@ui/room/FinalExamsList.svelte";
  import PlannerGrid from "./PlannerGrid.svelte";
  import type { FinalExamRow } from "@lib/types";
  import { MediaQuery } from "svelte/reactivity";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  let screenEl = $state<HTMLDivElement | null>(null);
  let finals = $state<FinalExamRow[]>([]);
  let lastRefreshKey = $state<string | null>(null);

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
  const unscheduled = $derived(
    (plan?.sections ?? []).filter((s) => !s.stale && isUnscheduled(s)),
  );
  const staleSections = $derived(
    (plan?.sections ?? []).filter((s) => s.stale),
  );
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

  function close() {
    plannerStore.close();
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

  function browseClasses() {
    close();
    openBrowseClasses(queryStore, sidePanelStore);
  }

  async function copyShareLink() {
    if (!plan) return;
    const url = `${location.origin}/?plan=${encodeSharePlan(plan)}`;
    try {
      await navigator.clipboard.writeText(url);
      toastStore.show("Share link copied", "success");
    } catch {
      toastStore.show("Could not copy the link", "error");
    }
  }

  function downloadIcs() {
    if (!plan) return;
    const term = termStore.activeTerm;
    const ics = buildPlanIcs(
      plan,
      term ? { startsOn: term.startsOn, endsOn: term.endsOn } : null,
    );
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `planner-${plan.label}-${plan.termId}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function deleteActivePlan() {
    if (!plan) return;
    if (!window.confirm(`Delete plan ${plan.label}?`)) return;
    plannerStore.deletePlan(plan.id);
  }

  $effect(() => {
    if (!plannerStore.open || !screenEl) return;
    return trapFocus(screenEl, { onEscape: close });
  });

  // Re-resolve natural keys and load finals once per plan per open (#planner).
  $effect(() => {
    if (!plannerStore.open || !plan || plan.sections.length === 0) return;
    const refreshKey = `${plan.id}::${plan.termId}`;
    if (refreshKey === lastRefreshKey) return;
    lastRefreshKey = refreshKey;

    const courseCodes = [...new Set(plan.sections.map((s) => s.courseCode))];
    Promise.all(
      courseCodes.map((code) =>
        fetchClassPage({
          termId: plan.termId,
          courseCodePrefix: code,
          limit: 100,
        }).then(
          (page) => page.rows,
          () => [],
        ),
      ),
    ).then((pages) => {
      const rows = pages.flat();
      if (rows.length > 0) plannerStore.refreshActivePlan(rows);
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

{#if plannerStore.open}
  <div
    bind:this={screenEl}
    class="planner-screen"
    role="dialog"
    aria-modal="true"
    aria-labelledby="planner-screen-title"
    in:fly={fullScreenReveal(reducedMotion.current)}
    out:fly={fullScreenDismiss(reducedMotion.current)}
  >
    <header class="planner-header">
      <button
        type="button"
        class="planner-back"
        onclick={close}
        aria-label="Back to map"
      >
        <ChevronLeft size={22} aria-hidden="true" />
        <span>Map</span>
      </button>
      <h1 class="planner-title" id="planner-screen-title">
        Planner
        {#if termStore.activeTerm}
          <span class="planner-term">{termStore.activeTerm.label}</span>
        {/if}
      </h1>
      {#if plan && plan.sections.length > 0}
        <button type="button" class="planner-action" onclick={copyShareLink}>
          Share
        </button>
        <button type="button" class="planner-action" onclick={downloadIcs}>
          .ics
        </button>
      {/if}
    </header>

    <div class="planner-tabs" role="tablist" aria-label="Plans">
      {#each plannerStore.plansForTerm as tabPlan (tabPlan.id)}
        <button
          type="button"
          role="tab"
          class="planner-tab"
          class:planner-tab--active={tabPlan.id === plan?.id}
          aria-selected={tabPlan.id === plan?.id}
          onclick={() => plannerStore.selectPlan(tabPlan.id)}
        >
          {tabPlan.label}
        </button>
      {/each}
      <button
        type="button"
        class="planner-tab planner-tab--new"
        onclick={() => plannerStore.createPlan()}
        aria-label="New plan"
      >
        +
      </button>
      {#if plan}
        <button
          type="button"
          class="planner-tab planner-tab--delete"
          onclick={deleteActivePlan}
          aria-label="Delete plan {plan.label}"
        >
          Delete
        </button>
      {/if}
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
    </div>

    <div class="planner-body">
      {#if !plan || plan.sections.length === 0}
        <div class="planner-empty">
          <p>No classes in this plan yet.</p>
          <button type="button" class="planner-browse" onclick={browseClasses}>
            Browse classes
          </button>
        </div>
      {:else}
        <PlannerGrid
          sections={plan.sections}
          conflicts={plannerStore.conflicts}
          onremove={plannerStore.removeOffering}
          onopenroom={openRoom}
        />

        <section class="planner-side" aria-label="Plan details">
          <h2 class="planner-side__heading">
            Sections ({offerings.length})
          </h2>
          <ul class="planner-offerings">
            {#each offerings as offering (offering.courseCode + offering.section)}
              <li class="planner-offering">
                <div class="planner-offering__main">
                  <span class="planner-offering__course">
                    {offering.courseCode} · {offering.section}
                  </span>
                  {#if offering.titles[0]}
                    <span class="planner-offering__title">
                      {offering.titles[0]}
                    </span>
                  {/if}
                </div>
                <button
                  type="button"
                  class="planner-offering__remove"
                  onclick={() =>
                    plannerStore.removeOffering(
                      offering.courseCode,
                      offering.section,
                    )}
                >
                  Remove
                </button>
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
{/if}

<style>
  .planner-screen {
    position: fixed;
    inset: 0;
    z-index: 18;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
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
    box-shadow: var(--map-chrome-shadow);
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

  .planner-term {
    margin-left: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: hsl(0, 0%, 45%);
  }

  .planner-action {
    all: unset;
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

  .planner-action:hover,
  .planner-action:focus-visible {
    background: hsl(5, 53%, 96%);
  }

  .planner-tabs {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.625rem;
    border-bottom: 1px solid hsl(0, 0%, 90%);
    overflow-x: auto;
  }

  .planner-tab {
    all: unset;
    box-sizing: border-box;
    min-width: 2rem;
    padding: 0.25rem 0.625rem;
    border: 1px solid hsl(0, 0%, 85%);
    border-radius: 999px;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: hsl(0, 0%, 30%);
    cursor: pointer;
  }

  .planner-tab--active {
    background: hsl(5, 53%, 32%);
    border-color: hsl(5, 53%, 32%);
    color: white;
  }

  .planner-tab--delete {
    border-color: hsl(0, 60%, 80%);
    color: hsl(0, 60%, 40%);
  }

  .planner-conflict-badge {
    margin-left: auto;
    flex: 0 0 auto;
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
    grid-template-columns: minmax(0, 1fr) 18rem;
    gap: 0.75rem;
    align-content: start;
    -webkit-overflow-scrolling: touch;
  }

  @media (max-width: 48rem) {
    .planner-body {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .planner-empty {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3rem 1rem;
    color: hsl(0, 0%, 40%);
  }

  .planner-empty p {
    margin: 0;
  }

  .planner-browse {
    all: unset;
    padding: 0.5rem 1rem;
    border-radius: 999px;
    background: hsl(5, 53%, 32%);
    color: white;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
  }

  .planner-browse:hover,
  .planner-browse:focus-visible {
    background: hsl(5, 53%, 26%);
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
</style>
