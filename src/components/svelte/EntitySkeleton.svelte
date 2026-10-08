<script lang="ts">
  // Skeleton placeholders for side-panel content that arrives via fetch.
  // Each variant mirrors the box model of the component it stands in for
  // (borders, padding, row heights, gaps) so the panel doesn't reflow when
  // real data lands. Dimension sources are noted per variant in the styles.
  type Variant =
    | "rooms"
    | "classes"
    | "exams"
    | "directory"
    | "events"
    | "detail"
    | "room-detail";

  interface Props {
    variant: Variant;
    /** Screen-reader announcement. Pass "" when a visible status line nearby
     * already announces the load, to avoid a double announcement. */
    label?: string;
    /** Row/card count override. */
    rows?: number;
    /** rooms: real section heading text (e.g. "Rooms in the building"). */
    heading?: string;
  }

  const { variant, label = "Loading…", rows, heading }: Props = $props();

  const DEFAULT_ROWS: Record<Variant, number> = {
    rooms: 6,
    classes: 3,
    exams: 2,
    directory: 8,
    events: 3,
    detail: 1,
    "room-detail": 2,
  };
  const count = $derived(rows ?? DEFAULT_ROWS[variant]);

  // Cycled widths so text bars read as lines of varying length, not stripes.
  const TEXT_WIDTHS = ["42%", "55%", "34%", "61%", "46%", "38%", "52%", "44%"];
  function textWidth(index: number): string {
    return TEXT_WIDTHS[index % TEXT_WIDTHS.length];
  }
</script>

{#snippet classCards(cardCount: number)}
  <div class="sk-class-list">
    {#each { length: cardCount } as _, i (i)}
      <section class="sk-class-card">
        <header class="sk-class-card__header">
          <span class="sk-class-card__title sk-bar"></span>
          <span
            class="sk-class-card__subtitle sk-bar"
            style:width={textWidth(i + 3)}
          ></span>
          <span class="sk-class-card__section sk-bar"></span>
        </header>
        <div class="sk-class-card__body">
          <div class="sk-class-section-row">
            <div class="sk-class-section-row__main">
              <span class="sk-class-section-row__type sk-bar"></span>
              <span class="sk-class-section-row__schedule sk-bar"></span>
            </div>
            <span class="sk-class-section-row__pill sk-bar"></span>
          </div>
        </div>
      </section>
    {/each}
  </div>
{/snippet}

<div
  class="entity-skeleton"
  role={label ? "status" : undefined}
  aria-label={label || undefined}
  aria-hidden={label ? undefined : true}
>
  <div class="entity-skeleton__inner" aria-hidden="true">
    {#if variant === "rooms"}
      <section class="sk-rooms-section">
        {#if heading}
          <h3 class="sk-section-heading">{heading}</h3>
        {/if}
        <span class="sk-term-chip sk-bar"></span>
        <div class="sk-room-list">
          {#each { length: count } as _, i (i)}
            <div class="sk-room-row">
              <span class="sk-room-row__icon sk-bar"></span>
              <span
                class="sk-room-row__code sk-bar"
                style:width={textWidth(i)}
              ></span>
              <span class="sk-room-row__chip sk-bar"></span>
            </div>
          {/each}
        </div>
      </section>
    {:else if variant === "classes"}
      {@render classCards(count)}
    {:else if variant === "exams"}
      <div class="sk-exam-list">
        {#each { length: count } as _, i (i)}
          <article class="sk-exam-row">
            <span class="sk-exam-row__course sk-bar"></span>
            <span
              class="sk-exam-row__title sk-bar"
              style:width={textWidth(i + 1)}
            ></span>
            <span class="sk-exam-row__when sk-bar"></span>
          </article>
        {/each}
      </div>
    {:else if variant === "directory"}
      <ul class="sk-directory-list">
        {#each { length: count } as _, i (i)}
          <li class="sk-directory-row">
            <span
              class="sk-directory-row__label sk-bar"
              style:width={textWidth(i)}
            ></span>
            <span class="sk-directory-row__meta sk-bar"></span>
            <span class="sk-directory-row__chevron sk-bar"></span>
          </li>
        {/each}
      </ul>
    {:else if variant === "events"}
      <div class="sk-event-list">
        {#each { length: count } as _, i (i)}
          <article class="sk-event-card">
            <span class="sk-event-card__image sk-bar"></span>
            <span class="sk-event-card__copy">
              <span class="sk-event-card__top">
                <span
                  class="sk-event-card__title sk-bar"
                  style:width={textWidth(i + 2)}
                ></span>
                <span class="sk-event-card__badge sk-bar"></span>
              </span>
              <span class="sk-event-card__meta sk-bar"></span>
              <span class="sk-event-card__location sk-bar"></span>
              <span class="sk-event-card__action sk-bar"></span>
            </span>
          </article>
        {/each}
      </div>
    {:else if variant === "room-detail"}
      <div class="sk-room-detail">
        <header class="sk-room-detail__header">
          <span class="sk-room-detail__breadcrumb sk-bar"></span>
          <span class="sk-room-detail__title sk-bar"></span>
          <span class="sk-room-detail__badge sk-bar"></span>
          <span class="sk-room-detail__context sk-bar"></span>
          <div class="sk-detail__actions">
            <span class="sk-detail__chip sk-bar" style:width="5.5rem"></span>
            <span class="sk-detail__chip sk-bar" style:width="5.75rem"></span>
            <span class="sk-detail__chip sk-bar" style:width="5.25rem"></span>
            <span class="sk-detail__chip sk-bar" style:width="4.5rem"></span>
          </div>
        </header>
        <div class="sk-detail__directions">
          <span class="sk-detail__directions-label sk-bar"></span>
          <span class="sk-detail__directions-line sk-bar"></span>
          <span
            class="sk-detail__directions-line sk-bar"
            style:width="82%"
          ></span>
          <span
            class="sk-detail__directions-label sk-bar"
            style:width="6.5rem"
          ></span>
          <span
            class="sk-detail__directions-line sk-bar"
            style:width="90%"
          ></span>
        </div>
        <section class="sk-room-detail__schedule">
          <h3 class="sk-section-heading">Classes in this room</h3>
          <span class="sk-term-chip sk-bar"></span>
          <span class="sk-room-detail__scope sk-bar"></span>
          {@render classCards(count)}
        </section>
      </div>
    {:else if variant === "detail"}
      <div class="sk-detail">
        <div class="sk-detail__title-row">
          <span class="sk-detail__title sk-bar"></span>
          <span class="sk-detail__badge sk-bar"></span>
        </div>
        <div class="sk-detail__actions">
          <span class="sk-detail__chip sk-bar" style:width="4.5rem"></span>
          <span class="sk-detail__chip sk-bar" style:width="5.5rem"></span>
          <span class="sk-detail__chip sk-bar" style:width="4.75rem"></span>
        </div>
        <div class="sk-detail__directions">
          <span class="sk-detail__directions-label sk-bar"></span>
          <span class="sk-detail__directions-line sk-bar"></span>
          <span
            class="sk-detail__directions-line sk-bar"
            style:width="82%"
          ></span>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .entity-skeleton,
  .entity-skeleton__inner {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
  }

  .sk-bar {
    display: block;
    flex: 0 0 auto;
    background: var(--sk-bar, var(--theme-surface-2, #ececec));
    border-radius: 0.25rem;
    animation: sk-pulse 1.4s ease-in-out infinite;
  }

  /* ── rooms — mirrors ResultDisplay section + RoomDisplay rows ──────────
     Row box: 0.5rem 0.75rem padding + 1.5rem content + 2×1px border
     = 2.625rem tall, matching .room-data. */
  .sk-rooms-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem; /* .rooms-section */
    padding-top: 0.5rem;
    border-top: 1px solid var(--theme-border, #ececec); /* .entity-list-section */
    flex: 1 1 0;
  }

  .sk-section-heading {
    margin: 0;
    font-size: 0.8125rem; /* .entity-section-heading */
    font-weight: 700;
    color: var(--theme-text, #3f3f46);
  }

  .sk-term-chip {
    width: 9rem;
    height: 1.75rem; /* TermSelector map-chrome-chip */
    border-radius: 999px;
  }

  .sk-room-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem; /* .room-list */
  }

  .sk-room-row {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.5rem; /* .room-data__content */
    height: 2.625rem;
    padding: 0.5rem 0.75rem; /* .room-data */
    background: var(--theme-surface, white);
    border: 1px solid var(--theme-border, #ececec);
    border-radius: 0.5rem;
  }

  .sk-room-row__icon {
    width: 1.5rem; /* .icon-wrapper */
    height: 1.5rem;
    border-radius: 0.375rem;
  }

  .sk-room-row__code {
    height: 0.8125rem; /* .room-code font-size */
  }

  .sk-room-row__chip {
    width: 3.75rem; /* "12 classes" chip */
    height: 1.0625rem; /* 0.6875rem text + 2×2px padding (.class-count) */
    margin-left: auto;
  }

  /* ── classes — mirrors Classes.svelte offering cards ─────────────────── */
  .sk-class-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem; /* .class-list */
    margin: 0.5rem 0;
  }

  .sk-class-card {
    border: 1px solid var(--theme-border, hsl(0, 0%, 88%));
    border-radius: 0.5rem;
    background: var(--theme-surface, hsl(0, 0%, 98%));
    overflow: hidden;
    --sk-bar: var(--theme-surface-3, #e4e4e7); /* bars sit on the 98% card bg */
  }

  .sk-class-card__header {
    display: flex;
    flex-direction: column;
    gap: 0.3125rem;
    padding: 0.625rem 0.75rem 0.375rem; /* .class-offering__header */
    border-bottom: 1px solid var(--theme-border, hsl(0, 0%, 92%));
  }

  .sk-class-card__title {
    width: 6.5rem; /* course code, e.g. "CMSC 130" */
    height: 0.9375rem; /* .class-offering__title font-size */
  }

  .sk-class-card__subtitle {
    height: 0.8125rem; /* .class-offering__subtitle */
  }

  .sk-class-card__section {
    width: 5.5rem; /* "Section XYZ-1" */
    height: 0.75rem; /* .class-offering__section */
  }

  .sk-class-card__body {
    padding: 0.5rem 0.75rem 0.625rem; /* .class-offering__sections */
  }

  .sk-class-section-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem; /* .class-section-row */
    background: var(--theme-surface, white);
    border: 1px solid var(--theme-border, hsl(0, 0%, 92%));
    border-radius: 0.375rem;
  }

  .sk-class-section-row__main {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 0.3125rem;
  }

  .sk-class-section-row__type {
    width: 7rem; /* "Lecture in ROOM" */
    height: 0.8125rem;
  }

  .sk-class-section-row__schedule {
    width: 10rem; /* "TTh 10:00 AM - 11:30 AM" */
    height: 0.75rem;
  }

  .sk-class-section-row__pill {
    width: 4.75rem; /* "Open room" pill */
    height: 1.5rem; /* 0.6875rem text + 2×0.25rem padding + border */
    border-radius: 999px;
  }

  /* ── exams — mirrors FinalExamsList rows ─────────────────────────────── */
  .sk-exam-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem; /* .final-exam-list */
  }

  .sk-exam-row {
    display: flex;
    flex-direction: column;
    gap: 0.3125rem;
    padding: 0.625rem 0.75rem; /* .final-exam-row */
    border: 1px solid var(--theme-border, hsl(0, 0%, 90%));
    border-radius: 0.5rem;
    background: var(--theme-surface, hsl(0, 0%, 99%));
  }

  .sk-exam-row__course {
    width: 8rem; /* "CMSC 130 XYZ-1" */
    height: 0.875rem;
  }

  .sk-exam-row__title {
    height: 0.8125rem;
  }

  .sk-exam-row__when {
    width: 11rem; /* "Dec 11, 8:00 AM - 10:00 AM" */
    height: 0.8125rem;
  }

  /* ── directory — mirrors CampusBrowseList .entity-list-row ───────────── */
  .sk-directory-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem; /* .entity-nav-list */
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .sk-directory-row {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.625rem;
    padding: 0.4375rem 0.5rem 0.4375rem 0.625rem; /* .entity-list-row */
    background: var(--theme-surface, white);
    border: 1px solid var(--theme-border, #ececec);
    border-radius: 0.5rem;
  }

  .sk-directory-row__label {
    height: 0.8125rem; /* .entity-list-row font-size */
  }

  .sk-directory-row__meta {
    width: 2.75rem; /* "12 rooms" meta */
    height: 0.75rem;
    margin-left: auto;
  }

  .sk-directory-row__chevron {
    width: 1rem; /* ChevronRight size 16 */
    height: 1rem;
  }

  /* ── events — mirrors EventsList cards ───────────────────────────────── */
  .sk-event-list {
    display: grid;
    gap: 0.65rem; /* .events-list */
  }

  .sk-event-card {
    display: grid;
    grid-template-columns: 4rem minmax(0, 1fr);
    align-items: center;
    gap: 0.7rem;
    padding: 0.55rem; /* .events-list-card */
    border: 1px solid var(--theme-accent-border, #eee1e1);
    border-radius: 0.95rem;
  }

  .sk-event-card__image {
    width: 4rem; /* .events-list-card-image */
    height: 4rem;
    border-radius: 0.8rem;
  }

  .sk-event-card__copy {
    display: grid;
    gap: 0.3125rem; /* .events-list-card-copy line rhythm */
    min-width: 0;
  }

  .sk-event-card__top {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .sk-event-card__title {
    height: 0.9rem; /* .events-list-card-title */
  }

  .sk-event-card__badge {
    width: 3.5rem; /* status badge pill */
    height: 0.9375rem; /* 0.65rem text + 2×0.1rem padding */
    border-radius: 999px;
  }

  .sk-event-card__meta {
    width: 78%;
    height: 0.75rem; /* .events-list-card-meta */
  }

  .sk-event-card__location {
    width: 60%;
    height: 0.75rem;
  }

  .sk-event-card__action {
    width: 4rem; /* "Open details" */
    height: 0.75rem;
  }

  @media (max-width: 425px) {
    .sk-event-card {
      grid-template-columns: 3rem minmax(0, 1fr);
    }

    .sk-event-card__image {
      width: 3rem;
      height: 3rem;
    }
  }

  /* ── detail — mirrors the entity header + directions block ───────────── */
  .sk-detail {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    width: 100%;
  }

  .sk-detail__title-row {
    display: flex;
    align-items: center;
    gap: 0.5rem; /* .entity-header__title-row */
    min-height: 1.40625rem; /* 1.125rem × 1.25 title line box */
  }

  .sk-detail__title {
    width: 58%;
    height: 1.125rem; /* .entity-header__title font-size */
  }

  .sk-detail__badge {
    width: 5rem; /* .entity-header__badge */
    height: 1.0625rem; /* 0.6875rem text + 2×0.125rem padding */
  }

  .sk-detail__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem; /* .entity-actions */
    padding-top: 0.25rem;
  }

  .sk-detail__chip {
    height: 1.75rem; /* .map-chrome-action-chip min-height */
    border-radius: 0.75rem;
  }

  .sk-detail__directions {
    display: flex;
    flex-direction: column;
    gap: 0.4375rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--theme-border, #ddd6d6); /* .entity-directions */
  }

  .sk-detail__directions-label {
    width: 4.5rem; /* "Directions" */
    height: 0.75rem;
  }

  .sk-detail__directions-line {
    width: 100%;
    height: 0.875rem; /* .entity-directions__text font-size */
  }

  /* ── room-detail — mirrors the full RoomResult browse layout ─────────── */
  .sk-room-detail {
    display: flex;
    flex-direction: column;
    gap: 0.5rem; /* .entity-detail */
    width: 100%;
  }

  .sk-room-detail__header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.375rem; /* .entity-header */
  }

  .sk-room-detail__breadcrumb {
    width: 7rem; /* "‹ Building name" */
    height: 0.75rem; /* .entity-header__breadcrumb font-size */
  }

  .sk-room-detail__title {
    width: 9rem; /* room codes are short */
    height: 1.125rem; /* .entity-header__title font-size */
  }

  .sk-room-detail__badge {
    width: 5.5rem; /* .room-category-badge */
    height: 1.0625rem; /* 0.6875rem text + 2×0.125rem padding */
    border-radius: 999px;
  }

  .sk-room-detail__context {
    width: 60%; /* college name line */
    height: 0.8125rem; /* .entity-header__context font-size */
  }

  .sk-room-detail__schedule {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--theme-border, #ececec); /* .entity-list-section */
  }

  .sk-room-detail__scope {
    width: 85%;
    height: 0.75rem; /* .entity-schedule__scope note */
  }

  @keyframes sk-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.55;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sk-bar {
      animation: none;
    }
  }
</style>
