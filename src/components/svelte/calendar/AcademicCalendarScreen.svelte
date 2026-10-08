<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import { fly } from "svelte/transition";
  import { MediaQuery } from "svelte/reactivity";
  import { trapFocus } from "@lib/focus-trap";
  import { fullScreenReveal } from "@lib/motion";
  import { sidebarStore, termStore } from "@lib/store.svelte";
  import {
    buildEventTimeline,
    buildYearTimeline,
    currentAcademicYearTerms,
    resolveTermWindow,
    termWindowStatus,
    type TermStatus,
  } from "@lib/academic-calendar";
  import {
    holidaysWithin,
    milestonesForTerms,
    type CalendarMilestone,
    type MilestoneKind,
  } from "@lib/academic-milestones";
  import {
    formatShortDate,
    formatTermDateRange,
    toManilaDateKey,
  } from "@lib/term-calendar";
  import { termChipLabel, termFullLabel } from "@lib/term-label";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  // One snapshot per open keeps the screen calm and static.
  const today = new Date();

  let screenEl = $state<HTMLDivElement | null>(null);
  let bodyEl = $state<HTMLDivElement | null>(null);

  function close() {
    sidebarStore.changeOpened("map");
  }

  $effect(() => {
    if (!screenEl) return;
    return trapFocus(screenEl, { onEscape: close });
  });

  const activeTerms = $derived(termStore.terms.filter((term) => term.isActive));

  const yearTerms = $derived(currentAcademicYearTerms(activeTerms, today));

  const timeline = $derived(buildYearTimeline(yearTerms, today));

  const timelineHeading = $derived(
    yearTerms[0]?.schoolYear
      ? `AY ${yearTerms[0].schoolYear.replace("-", " - ")}`
      : "Academic year",
  );

  const todayLabel = today.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

  type CardStatus = TermStatus | "undated";
  const STATUS_LABEL: Record<CardStatus, string> = {
    "in-session": "In session",
    upcoming: "Upcoming",
    past: "Ended",
    undated: "Dates TBA",
  };

  const cards = $derived(
    activeTerms.map((term) => {
      const window = resolveTermWindow(term);
      const status: CardStatus = window
        ? termWindowStatus(window, today)
        : "undated";
      return { term, window, status };
    }),
  );

  const KIND_LABEL: Record<MilestoneKind, string> = {
    deadline: "Deadline",
    period: "Period",
    milestone: "Milestone",
    holiday: "Holiday",
  };

  const LEGEND: { kind: MilestoneKind; label: string }[] = [
    { kind: "deadline", label: "Deadline" },
    { kind: "period", label: "Period" },
    { kind: "milestone", label: "Milestone" },
    { kind: "holiday", label: "Holiday" },
  ];

  const todayKey = toManilaDateKey(today);

  // Registrar milestones for the terms on the strip, plus the official
  // holidays that fall inside it.
  const milestones = $derived(
    timeline
      ? [
          ...milestonesForTerms(yearTerms.map((term) => term.id)),
          ...holidaysWithin(timeline.rangeStart, timeline.rangeEnd),
        ]
      : [],
  );

  const milestoneTimeline = $derived(
    timeline ? buildEventTimeline(timeline, milestones) : null,
  );

  // Every card's own registrar dates, so a term can be opened on its own.
  // Keyed off the cards rather than the year strip: a card can sit outside
  // the strip's range and would otherwise open to nothing.
  const milestonesByTerm = $derived.by(() => {
    const byTerm = new Map<number, CalendarMilestone[]>();
    for (const milestone of milestonesForTerms(
      cards.map((card) => card.term.id),
    )) {
      const existing = byTerm.get(milestone.termId);
      if (existing) existing.push(milestone);
      else byTerm.set(milestone.termId, [milestone]);
    }
    return byTerm;
  });

  function isPast(milestone: CalendarMilestone) {
    return milestone.endsOn < todayKey;
  }

  function dateLabel(milestone: CalendarMilestone) {
    return milestone.startsOn === milestone.endsOn
      ? formatShortDate(milestone.startsOn)
      : formatTermDateRange({
          startsOn: milestone.startsOn,
          endsOn: milestone.endsOn,
        });
  }

  // Open at today, not at August: bring the first registrar date still ahead
  // to the top of the list, once per open. Past rows stay above it.
  let scrolledToToday = false;
  $effect(() => {
    if (scrolledToToday || !bodyEl || !milestoneTimeline) return;
    const next = bodyEl.querySelector<HTMLElement>(
      ".acal-milestones .acal-milestone:not(.acal-milestone--past)",
    );
    if (!next) return;
    scrolledToToday = true;
    // The month heading above the row gives it context.
    const anchor =
      next.closest(".acal-milestones__list")?.previousElementSibling ?? next;
    bodyEl.scrollTop +=
      anchor.getBoundingClientRect().top - bodyEl.getBoundingClientRect().top;
  });

  function markerTitle(entries: CalendarMilestone[]) {
    return entries
      .map((entry) => `${entry.label}, ${dateLabel(entry)}`)
      .join("\n");
  }
</script>

<div
  bind:this={screenEl}
  class="acal-screen"
  role="dialog"
  aria-modal="true"
  aria-labelledby="acal-screen-title"
  in:fly={fullScreenReveal(reducedMotion.current)}
>
  <header class="acal-header">
    <button
      type="button"
      class="acal-back"
      onclick={close}
      aria-label="Back to map"
      title="Back to map"
    >
      <ChevronLeft size={22} aria-hidden="true" />
    </button>
    <h1 class="acal-title" id="acal-screen-title">Academic calendar</h1>
  </header>

  <!-- The caveat's headline stays visible (#408); the detail is one tap
       away instead of a quarter of the screen. -->
  <details class="acal-about">
    <summary>May differ from the official UPLB academic calendar</summary>
    <p class="acal-note" role="note">
      Term windows are community-maintained per CRS term; the dated rows below
      are read from the Office of the University Registrar's published
      calendar. Verify anything you are relying on with the Registrar.
    </p>
  </details>

  <div class="acal-body" bind:this={bodyEl}>
    {#if !termStore.loaded}
      <p class="acal-status" role="status">Loading terms…</p>
    {:else if activeTerms.length === 0}
      <p class="acal-status">No academic terms available.</p>
    {:else}
      {#if timeline}
        <section class="acal-year" aria-label="{timelineHeading} timeline">
          <h2 class="acal-year__heading">{timelineHeading}</h2>
          <div class="acal-strip">
            {#each timeline.months as month (month.startPct)}
              <span class="acal-month" style="left: {month.startPct}%"
                >{month.label}</span
              >
            {/each}
            {#each timeline.segments as segment (segment.term.id)}
              <div
                class="acal-seg acal-seg--{segment.status}"
                style="left: {segment.startPct}%; width: {segment.widthPct}%"
                title="{segment.term.label}: {formatTermDateRange(
                  segment.window,
                )}"
              >
                <span class="acal-seg__label">{termChipLabel(segment.term)}</span>
              </div>
            {/each}
            {#each milestoneTimeline?.markers ?? [] as marker (marker.leftPct)}
              <span
                class="acal-dot acal-dot--{marker.events[0]?.kind ??
                  'milestone'}"
                class:acal-dot--past={marker.events.every(isPast)}
                style="left: {marker.leftPct}%"
                title={markerTitle(marker.events)}
                aria-hidden="true"
              >
                {#if marker.events.length > 1}{marker.events.length}{/if}
              </span>
            {/each}
            {#if timeline.todayPct !== null}
              <div
                class="acal-today"
                style="left: {timeline.todayPct}%"
                aria-hidden="true"
              ></div>
            {/if}
          </div>
          <p class="acal-caption">Today: {todayLabel} (Asia/Manila)</p>
          <ul class="acal-legend" aria-label="Timeline legend">
            {#each LEGEND as item (item.kind)}
              <li>
                <span class="acal-key acal-dot--{item.kind}" aria-hidden="true"
                ></span>
                {item.label}
              </li>
            {/each}
            <li>
              <span class="acal-key" aria-hidden="true">2</span>
              Dates on the same spot
            </li>
          </ul>
        </section>

        <section
          class="acal-milestones"
          aria-label="Registrar calendar for {timelineHeading}"
        >
          <h2 class="acal-year__heading">
            Registrar calendar for {timelineHeading}
          </h2>
          {#each milestoneTimeline?.months ?? [] as group (group.key)}
            <h3 class="acal-milestones__month">{group.label}</h3>
            <ul class="acal-milestones__list">
              {#each group.events as milestone (`${milestone.termId}-${milestone.label}-${milestone.startsOn}`)}
                <li
                  class="acal-milestone acal-milestone--{milestone.kind}"
                  class:acal-milestone--past={isPast(milestone)}
                >
                  <span class="acal-milestone__date">{dateLabel(milestone)}</span
                  >
                  <span class="acal-milestone__label">{milestone.label}</span>
                  <span class="acal-milestone__kind"
                    >{KIND_LABEL[milestone.kind]}</span
                  >
                </li>
              {/each}
            </ul>
          {:else}
            <p class="acal-status">
              No registrar calendar published for {timelineHeading} yet.
            </p>
          {/each}
          {#if milestoneTimeline && milestoneTimeline.outOfRangeCount > 0}
            <p class="acal-milestones__note">
              {milestoneTimeline.outOfRangeCount}
              {milestoneTimeline.outOfRangeCount === 1
                ? "registrar date falls"
                : "registrar dates fall"}
              outside the months shown, mostly pre-term registration. Every date
              for a term is in its card below.
            </p>
          {/if}
          <p class="acal-milestones__note">
            From the Office of the University Registrar's academic calendar for
            {timelineHeading}. Staff-only rows (faculty, University Council and
            BOR meetings) are omitted.
          </p>
        </section>
      {/if}

      <section class="acal-terms" aria-label="Terms">
        {#each cards as card (card.term.id)}
          {@const termMilestones = milestonesByTerm.get(card.term.id) ?? []}
          <!-- Native disclosure: keyboard support and open/close state for
               free, no store needed. The term in session starts open. -->
          <details
            class="acal-card"
            class:acal-card--current={card.status === "in-session"}
            open={card.status === "in-session"}
          >
            <summary class="acal-card__head">
              <h3 class="acal-card__label">{termFullLabel(card.term)}</h3>
              <span class="acal-badge acal-badge--{card.status}"
                >{STATUS_LABEL[card.status]}</span
              >
            </summary>
            <p class="acal-card__meta">
              <span>CRS {card.term.id}</span>
              {#if card.window}
                <span>{formatTermDateRange(card.window)}</span>
              {/if}
              {#if card.term.classCount > 0}
                <span>{card.term.classCount} classes campus-wide</span>
              {/if}
              {#if termMilestones.length > 0}
                <span class="acal-card__hint"
                  >{termMilestones.length} registrar dates</span
                >
              {/if}
            </p>
            {#if termMilestones.length > 0}
              <ul class="acal-card__dates">
                {#each termMilestones as milestone (`${milestone.label}-${milestone.startsOn}`)}
                  <li
                    class="acal-milestone acal-milestone--{milestone.kind}"
                    class:acal-milestone--past={isPast(milestone)}
                  >
                    <span class="acal-milestone__date"
                      >{dateLabel(milestone)}</span
                    >
                    <span class="acal-milestone__label">{milestone.label}</span>
                    <span class="acal-milestone__kind"
                      >{KIND_LABEL[milestone.kind]}</span
                    >
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="acal-card__empty">
                No registrar dates published for this term yet.
              </p>
            {/if}
          </details>
        {/each}
      </section>
    {/if}
  </div>
</div>

<style>
  .acal-screen {
    z-index: 150;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 1.25rem calc(1rem + env(safe-area-inset-bottom, 0px));
    background: var(--theme-surface, hsl(0, 0%, 98%));
    flex: 1 1 auto;
    pointer-events: auto;
    overflow: hidden;
  }

  /* App bar: icon back button, then the title (same as Today). */
  .acal-header {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: -0.5rem;
  }

  .acal-back {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 999px;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    cursor: pointer;
  }

  .acal-back:hover {
    background: var(--theme-accent-soft, hsl(5, 30%, 94%));
  }

  .acal-back:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
  }

  .acal-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }

  .acal-about {
    max-width: 52rem;
  }

  .acal-about summary {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    cursor: pointer;
  }

  .acal-about summary:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: 2px;
  }

  .acal-note {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .acal-body {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding-bottom: 1rem;
  }

  .acal-status {
    margin: 0;
    font-size: 0.875rem;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .acal-year {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 52rem;
  }

  .acal-year__heading {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--theme-text, hsl(0, 0%, 20%));
  }

  .acal-strip {
    position: relative;
    height: 4rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 88%));
    border-radius: 0.625rem;
    background: var(--theme-surface, white);
  }

  .acal-month {
    position: absolute;
    top: 0.25rem;
    padding-left: 0.1875rem;
    border-left: 1px solid var(--theme-border, hsl(0, 0%, 90%));
    height: calc(100% - 0.5rem);
    font-size: 0.5625rem;
    font-weight: 600;
    color: var(--theme-text-muted, hsl(0, 0%, 55%));
    line-height: 1;
    pointer-events: none;
  }

  .acal-seg {
    position: absolute;
    bottom: 0.375rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.375rem;
    overflow: hidden;
  }

  .acal-seg--past {
    background: var(--theme-surface-3, hsl(0, 0%, 90%));
    color: var(--theme-text-2, hsl(0, 0%, 35%));
  }

  .acal-seg--upcoming {
    background: var(--theme-accent-soft, hsl(5, 30%, 92%));
    color: var(--theme-accent-text, hsl(5, 40%, 30%));
  }

  .acal-seg--in-session {
    background: var(--theme-accent-fill, hsl(5, 53%, 32%));
    color: white;
  }

  /* Above the today line, on the segment's own fill, so the line passes
     behind the label instead of cutting through it. */
  .acal-seg__label {
    position: relative;
    z-index: 2;
    background: inherit;
    border-radius: 0.25rem;
    font-size: 0.625rem;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 0.25rem;
  }

  /* Markers snap to a 5% grid (EVENT_MARKER_STEP_PCT), so this dot must stay
     narrower than 5% of the strip at 320px (~15px) or clusters can touch. */
  .acal-dot,
  .acal-key {
    position: absolute;
    top: 0.9rem;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 999px;
    font-size: 0.5rem;
    font-weight: 800;
    line-height: 1;
    color: white;
    background: var(--theme-accent-fill, hsl(5, 53%, 32%));
  }

  /* A missed deadline costs money, so deadlines read loudest. */
  .acal-dot--deadline {
    background: var(--theme-accent-fill, hsl(5, 72%, 42%));
  }

  .acal-dot--period {
    background: var(--theme-surface, white);
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    box-shadow: inset 0 0 0 2px hsl(5, 53%, 32%);
  }

  .acal-dot--holiday {
    background: hsl(210, 45%, 55%);
  }

  .acal-dot--past {
    background: hsl(0, 0%, 62%);
    color: white;
    box-shadow: none;
  }

  .acal-today {
    position: absolute;
    z-index: 1;
    top: 0;
    bottom: 0;
    width: 2px;
    background: hsl(210, 80%, 45%);
  }

  .acal-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.6875rem;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .acal-legend li {
    display: inline-flex;
    align-items: center;
    gap: 0.3125rem;
  }

  /* Legend swatches reuse the dot styles, in flow instead of on the strip. */
  .acal-legend .acal-key {
    position: static;
    flex: 0 0 auto;
    transform: none;
  }

  .acal-caption {
    margin: 0;
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--theme-blue-text, hsl(210, 60%, 35%));
  }

  .acal-milestones {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    max-width: 52rem;
  }

  .acal-milestones__month {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
  }

  .acal-milestones__list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .acal-milestone {
    display: grid;
    grid-template-columns: 7.5rem minmax(0, 1fr) auto;
    align-items: baseline;
    gap: 0.25rem 0.75rem;
    padding: 0.4375rem 0.75rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 88%));
    border-radius: 0.625rem;
    background: var(--theme-surface, white);
  }

  .acal-milestone--deadline {
    border-color: var(--theme-accent-border, hsl(5, 45%, 78%));
    background: var(--theme-accent-soft, hsl(5, 60%, 98%));
  }

  /* Past dates stay on the calendar, just quieter than what is still ahead. */
  .acal-milestone--past {
    border-color: var(--theme-border, hsl(0, 0%, 90%));
    background: var(--theme-surface, hsl(0, 0%, 97%));
  }

  .acal-milestone__date {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--theme-text, hsl(0, 0%, 30%));
    font-variant-numeric: tabular-nums;
  }

  .acal-milestone--past .acal-milestone__date,
  .acal-milestone--past .acal-milestone__label {
    color: var(--theme-text-2, hsl(0, 0%, 48%));
  }

  .acal-milestone__label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--theme-text, hsl(0, 0%, 16%));
    overflow-wrap: anywhere;
  }

  .acal-milestone__kind {
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--theme-text-muted, hsl(0, 0%, 52%));
  }

  .acal-milestones__note {
    margin: 0.25rem 0 0;
    font-size: 0.6875rem;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
  }

  .acal-terms {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 52rem;
  }

  /* block, not flex: a flex <details> puts the disclosure box out of flow. */
  .acal-card {
    display: block;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 88%));
    border-radius: 0.625rem;
    background: var(--theme-surface, white);
  }

  .acal-card__head {
    cursor: pointer;
    /* Both properties needed: Safari still uses the webkit marker. */
    list-style: none;
  }

  .acal-card__head::-webkit-details-marker {
    display: none;
  }

  /* Chevron stands in for the marker we just removed. */
  .acal-card__head::after {
    content: "";
    flex: 0 0 auto;
    width: 0.4375rem;
    height: 0.4375rem;
    margin-left: auto;
    border-right: 2px solid hsl(0, 0%, 45%);
    border-bottom: 2px solid hsl(0, 0%, 45%);
    transform: rotate(45deg) translate(-0.125rem, -0.125rem);
    transition: transform 120ms ease;
  }

  .acal-card[open] > .acal-card__head::after {
    transform: rotate(-135deg) translate(-0.125rem, -0.125rem);
  }

  .acal-card__dates {
    margin: 0.5rem 0 0;
    padding: 0.5rem 0 0;
    border-top: 1px solid var(--theme-border, hsl(0, 0%, 92%));
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .acal-card__hint {
    font-weight: 650;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }

  .acal-card__empty {
    margin: 0.5rem 0 0;
    padding-top: 0.5rem;
    border-top: 1px solid var(--theme-border, hsl(0, 0%, 92%));
    font-size: 0.75rem;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
  }

  .acal-card--current {
    border-color: var(--theme-accent-text, hsl(5, 53%, 32%));
    background: var(--theme-accent-soft, hsl(5, 53%, 98%));
  }

  .acal-card__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .acal-card__label {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--theme-text, hsl(0, 0%, 16%));
  }

  .acal-badge {
    flex: 0 0 auto;
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.125rem 0.4375rem;
    border-radius: 999px;
  }

  .acal-badge--in-session {
    background: var(--theme-accent-fill, hsl(5, 53%, 32%));
    color: white;
  }

  .acal-badge--upcoming {
    background: var(--theme-accent-soft, hsl(5, 30%, 92%));
    color: var(--theme-accent-text, hsl(5, 40%, 30%));
  }

  .acal-badge--past,
  .acal-badge--undated {
    background: var(--theme-surface-2, hsl(0, 0%, 92%));
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .acal-card__meta {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.75rem;
    font-size: 0.75rem;
    color: var(--theme-text-2, hsl(0, 0%, 42%));
  }

  @media (max-width: 48rem) {
    .acal-screen {
      padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
    }

    /* Let the scroller run to the bottom edge instead of stopping above an
       empty strip: the bottom-nav inset Entry gives the screen moves inside
       the scroller, so the last card still scrolls clear of the nav. */
    :global(.app-layout .ui-layer) > .acal-screen {
      padding-bottom: 0;
    }

    .acal-body {
      padding-bottom: calc(
        1rem + var(--mobile-bottom-nav-height, 4.5rem) +
          env(safe-area-inset-bottom, 0px)
      );
    }
  }

  /* 320px: keep every other month label so ticks don't collide. */
  @media (max-width: 30rem) {
    .acal-month:nth-child(even) {
      font-size: 0;
    }

    /* Three columns do not fit; date over label, kind badge on the date row. */
    .acal-milestone {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .acal-milestone__label {
      grid-column: 1 / -1;
    }
  }
</style>
