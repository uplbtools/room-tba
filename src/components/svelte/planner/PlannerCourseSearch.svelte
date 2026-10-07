<script lang="ts">
  import Search from "@lucide/svelte/icons/search";
  import { SvelteSet } from "svelte/reactivity";
  import { fetchClassPage, fetchAllClasses } from "@lib/classes-api";
  import {
    groupClassesByOffering,
    offeringGroupKey,
    type ClassOfferingGroup,
  } from "@lib/class-offering-groups";
  import { plannerStore, termStore, toastStore } from "@lib/store.svelte";
  import { formatScheduleShort, formatSectionType } from "@lib/planner/format";
  import type { ClassMapValue } from "@lib/types";

  const termId = $derived(
    plannerStore.activePlan?.termId ?? termStore.activeTermId,
  );

  let query = $state("");
  let loading = $state(false);
  let loadingMore = $state(false);
  let rows = $state<ClassMapValue[]>([]);
  let nextCursor = $state<string | null>(null);
  let hasMore = $state(false);
  let sentinelEl = $state<HTMLDivElement | null>(null);
  // An empty query used to dump the whole term A-Z (AAE 10, AAE 103, ...).
  // Browsing is now opt-in; the default empty state points at search.
  let browsing = $state(false);
  const planCourses = $derived([
    ...new Set(
      (plannerStore.activePlan?.sections ?? []).map((s) => s.courseCode),
    ),
  ]);
  const expanded = new SvelteSet<string>();

  // Browse mode (no query) pages through the term 100 at a time (#planner).
  async function loadMore() {
    if (loadingMore || query.trim() || !nextCursor) return;
    loadingMore = true;
    try {
      const page = await fetchClassPage({
        termId,
        limit: 100,
        cursor: nextCursor,
      });
      rows = [...rows, ...page.rows];
      nextCursor = page.nextCursor;
      hasMore = page.hasMore;
    } catch {
      // keep what we have; the note still offers searching by course code
    } finally {
      loadingMore = false;
    }
  }

  // Auto-load the next page when the end of the list scrolls into view, so
  // browsing does not stall on a "Show more" click every 100 sections. The
  // button stays as the visible affordance and keyboard path. Reading
  // rows.length re-arms the observer after each page: if the sentinel is
  // still on screen (short viewport), a fresh observer fires again.
  $effect(() => {
    const el = sentinelEl;
    void rows.length;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  });

  $effect(() => {
    const q = query.trim();
    const t = termId;
    if (!q && !browsing) {
      rows = [];
      nextCursor = null;
      hasMore = false;
      loading = false;
      return;
    }
    const timer = setTimeout(
      () => {
        loading = true;
        // With a course code typed, pull every section (HK 12 has 147, past the
        // 100/page cap). Browsing the whole term stays a single capped page.
        const request = q
          ? fetchAllClasses({ termId: t, courseCodePrefix: q })
          : fetchClassPage({ termId: t, limit: 100 });
        request
          .then((page) => {
            rows = page.rows;
            nextCursor = page.nextCursor;
            hasMore = page.hasMore;
          })
          .catch(() => {
            rows = [];
            nextCursor = null;
            hasMore = false;
          })
          .finally(() => {
            loading = false;
          });
      },
      q ? 250 : 0,
    );
    return () => clearTimeout(timer);
  });

  type CourseGroup = {
    /** Stable list/expand key: courseCode + title. */
    key: string;
    courseCode: string;
    title: string | null;
    offerings: ClassOfferingGroup[];
  };

  /** Bucket by code + title so shared codes with different titles (e.g. HK 12) split. */
  function courseGroupKey(
    courseCode: string,
    title: string | null | undefined,
  ): string {
    return `${courseCode}::${title ?? ""}`;
  }

  const courses = $derived.by(() => {
    const byCourse = new Map<string, CourseGroup>();
    for (const offering of groupClassesByOffering(rows)) {
      if (offering.key.startsWith("__solo__")) continue;
      const key = courseGroupKey(offering.courseCode, offering.courseTitle);
      let course = byCourse.get(key);
      if (!course) {
        course = {
          key,
          courseCode: offering.courseCode,
          title: offering.courseTitle,
          offerings: [],
        };
        byCourse.set(key, course);
      }
      if (!course.title && offering.courseTitle) {
        course.title = offering.courseTitle;
      }
      course.offerings.push(offering);
    }
    return [...byCourse.values()].sort((a, b) => {
      const byCode = a.courseCode.localeCompare(b.courseCode);
      if (byCode !== 0) return byCode;
      return (a.title ?? "").localeCompare(b.title ?? "");
    });
  });

  function selectedCount(course: CourseGroup): number {
    return course.offerings.filter((o) =>
      plannerStore.addedKeys.has(
        offeringGroupKey(o.courseCode, o.section) ?? "",
      ),
    ).length;
  }

  function toggleExpanded(key: string) {
    if (expanded.has(key)) expanded.delete(key);
    else expanded.add(key);
  }

  function togglePlan(offering: ClassOfferingGroup) {
    const key = offeringGroupKey(offering.courseCode, offering.section);
    if (!key) return;
    if (plannerStore.addedKeys.has(key)) {
      plannerStore.removeSections(offering.sections);
    } else {
      // One section per course: picking a different section of a course you've
      // already added swaps it in rather than stacking multiple labs (#13).
      plannerStore.replaceCourse(offering.courseCode, offering.sections);
      // Short so it stays one line on a phone; the row's "Added" state
      // carries the detail.
      toastStore.show(
        `Added ${offering.courseCode} ${offering.section}`,
        "success",
      );
    }
  }

  /** One line per component: "Lec WF 4–5 PM · EAA LH". */
  function offeringParts(offering: ClassOfferingGroup): string[] {
    return offering.sections.map((s) => {
      const sched = s.schedule?.length
        ? s.schedule.map(formatScheduleShort).join(", ")
        : "TBA";
      const room = s.roomCode ? ` · ${s.roomCode}` : "";
      return `${formatSectionType(s.type)} ${sched}${room}`;
    });
  }

  /** Drop shared HK 12 base name + parens; leave the activity (e.g. Badminton). */
  function stripHk12Title(title: string | null | undefined): string {
    if (!title) return "";
    return title
      .replace(/Human Kinetics Activities/gi, "")
      .replace(/[()]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
</script>

<aside class="course-search" aria-label="Search courses">
  <label class="course-search__box">
    <Search size={14} aria-hidden="true" />
    <input
      id="planner-course-search"
      type="search"
      placeholder="Search courses (e.g. CMSC 12)"
      bind:value={query}
    />
  </label>

  {#if !query.trim() && !browsing}
    <div class="course-search__empty">
      <p class="course-search__hint">
        Type a course code to see its sections, e.g. <strong>CMSC 12</strong>
        or <strong>MATH 27</strong>.
      </p>
      {#if planCourses.length > 0}
        <div class="course-search__chips" aria-label="Courses in this plan">
          {#each planCourses as code (code)}
            <button
              type="button"
              class="course-search__chip"
              onclick={() => (query = code)}
            >
              {code}
            </button>
          {/each}
        </div>
      {/if}
      <button
        type="button"
        class="course-search__more"
        onclick={() => (browsing = true)}
      >
        Browse all courses
      </button>
    </div>
  {:else if loading}
    <p class="course-search__note">Searching…</p>
  {:else if courses.length === 0}
    <p class="course-search__note">
      {query.trim() ? "No courses found this term." : "No classes this term."}
    </p>
  {:else}
    <div class="course-search__list">
      <div class="course-search__list-container">
        {#each courses as course (course.key)}
          {@const picked = selectedCount(course)}
          <div class="course-item">
            <button
              type="button"
              class="course-item__header"
              aria-expanded={expanded.has(course.key)}
              onclick={() => toggleExpanded(course.key)}
            >
              <span class="course-item__code">
                {#if course.courseCode.includes("HK 12")}
                  {course.courseCode}
                  {#if stripHk12Title(course.title)}
                    {" "}({stripHk12Title(course.title)})
                  {/if}
                {:else}
                  {course.courseCode}
                {/if}
              </span>
              <span class="course-item__meta">
                {#if picked > 0}
                  <span class="course-item__picked">{picked} in plan</span>
                {/if}
                {course.offerings.length}
                section{course.offerings.length === 1 ? "" : "s"}
              </span>
              {#if course.title}
                <span class="course-item__title">
                  {course.title}
                </span>
              {/if}
            </button>
            {#if expanded.has(course.key)}
              <ul class="course-item__sections">
                {#each course.offerings as offering (offering.key)}
                  {@const key = offeringGroupKey(
                    offering.courseCode,
                    offering.section,
                  )}
                  {@const added = plannerStore.addedKeys.has(key ?? "")}
                  <li class="section-row">
                    <div class="section-row__main">
                      <span class="section-row__name">{offering.section}</span>
                      {#each offeringParts(offering) as part, i (i)}
                        <span class="section-row__schedule">{part}</span>
                      {/each}
                    </div>
                    <button
                      type="button"
                      class="section-row__toggle"
                      class:section-row__toggle--added={added}
                      aria-pressed={added}
                      aria-label={added
                        ? `Remove ${offering.courseCode} ${offering.section} from plan`
                        : undefined}
                      onclick={() => togglePlan(offering)}
                    >
                      {added ? "✓ Added" : "Add"}
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/each}
        {#if hasMore && !query.trim()}
          <div
            class="course-search__sentinel"
            bind:this={sentinelEl}
            aria-hidden="true"
          ></div>
        {/if}
      </div>
    </div>
    {#if hasMore}
      <p class="course-search__note">
        {#if !query.trim()}
          Showing {courses.length} courses so far ({courses.at(-1)?.courseCode}
          and earlier).
          <button
            type="button"
            class="course-search__more"
            onclick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Show more"}
          </button>
        {:else}
          Showing the first {rows.length} sections. Search a fuller course code
          to find the rest.
        {/if}
      </p>
    {/if}
  {/if}
</aside>

<style>
  .course-search {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
    min-height: 0;
  }

  .course-search__box {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 85%));
    border-radius: 0.5rem;
    background: var(--theme-surface, white);
    color: var(--theme-text-2, hsl(0, 0%, 45%));
    flex: 0 0 auto;
  }

  .course-search__box:focus-within {
    border-color: var(--theme-accent-text, hsl(5, 53%, 42%));
  }

  .course-search__box input {
    all: unset;
    flex: 1;
    min-width: 0;
    font-size: 0.8125rem;
    color: var(--theme-text, hsl(0, 0%, 15%));
  }

  .course-search__note {
    position: sticky;
    bottom: 0;
    margin: 0;
    padding: 0.5rem 0.375rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--theme-text, hsl(0, 0%, 28%));
    background: var(--theme-surface, hsl(0, 0%, 100%));
    border-top: 1px solid var(--theme-border, hsl(0, 0%, 90%));
  }

  .course-search__empty {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.25rem 0.125rem;
  }

  .course-search__hint {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: var(--theme-text-2, hsl(0, 0%, 35%));
  }

  .course-search__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .course-search__chip {
    all: unset;
    box-sizing: border-box;
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    background: var(--theme-accent-soft, hsl(5, 53%, 95%));
    color: var(--theme-accent-text, hsl(5, 53%, 28%));
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }

  .course-search__chip:hover,
  .course-search__chip:focus-visible {
    background: var(--theme-accent-soft, hsl(5, 53%, 90%));
  }

  .course-search__more {
    all: unset;
    margin-left: 0.25rem;
    padding: 0.125rem 0.625rem;
    border: 1px solid var(--theme-accent-border, hsl(5, 53%, 82%));
    border-radius: 999px;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }

  .course-search__more:hover:not(:disabled),
  .course-search__more:focus-visible {
    background: var(--theme-accent-soft, hsl(5, 53%, 96%));
  }

  .course-search__more:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  .course-search__list {
    margin: 0;
    padding: 0;
    gap: 0.375rem;
    overflow-y: auto;
    min-height: 0;
  }

  .course-search__list-container {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .course-search__sentinel {
    height: 1px;
    flex-shrink: 0;
  }

  .course-item {
    border: 1px solid var(--theme-border, hsl(0, 0%, 90%));
    border-radius: 0.5rem;
    background: var(--theme-surface, white);
    overflow: hidden;
  }

  .course-item__header {
    all: unset;
    box-sizing: border-box;
    display: block;
    width: 100%;
    padding: 0.5rem 0.625rem;
    cursor: pointer;
  }

  .course-item__header:hover,
  .course-item__header:focus-visible {
    background: var(--theme-accent-soft, hsl(5, 53%, 98%));
  }

  .course-item__code {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }

  .course-item__meta {
    float: right;
    font-size: 0.6875rem;
    color: var(--theme-text-muted, hsl(0, 0%, 50%));
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }

  .course-item__picked {
    padding: 0.0625rem 0.375rem;
    border-radius: 999px;
    background: var(--theme-green-soft, hsl(140, 60%, 94%));
    color: var(--theme-green-text, hsl(140, 60%, 25%));
    font-weight: 700;
  }

  .course-item__title {
    display: block;
    margin-top: 0.125rem;
    font-size: 0.75rem;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .course-item__sections {
    list-style: none;
    margin: 0;
    padding: 0.25rem 0.625rem 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    border-top: 1px solid var(--theme-border, hsl(0, 0%, 93%));
  }

  .section-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .section-row__main {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .section-row__name {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--theme-text, hsl(0, 0%, 20%));
  }

  .section-row__schedule {
    font-size: 0.6875rem;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
  }

  .section-row__toggle {
    all: unset;
    box-sizing: border-box;
    flex-shrink: 0;
    min-width: 2rem;
    padding: 0.1875rem 0.5rem;
    border: 1px solid var(--theme-accent-border, hsl(5, 53%, 82%));
    border-radius: 999px;
    text-align: center;
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    cursor: pointer;
  }

  .section-row__toggle:hover,
  .section-row__toggle:focus-visible {
    background: var(--theme-accent-soft, hsl(5, 53%, 96%));
  }

  /* Hover/focus used to repaint this pink and leave a white check on it,
     near invisible after the tap that added it. Pin the added colors. */
  .section-row__toggle--added,
  .section-row__toggle--added:hover,
  .section-row__toggle--added:focus-visible {
    background: hsl(140, 45%, 30%);
    border-color: var(--theme-green-text, hsl(140, 45%, 30%));
    color: white;
  }

  /* --- Mobile (phones): readable rows and ≥44px tap targets for the search
     field, course headers, and Add/✓ toggles. --- */
  @media (max-width: 640px) {
    /* 1rem input avoids the iOS focus zoom; roomier field overall. */
    .course-search__box {
      padding: 0.625rem 0.75rem;
    }

    .course-search__box input {
      font-size: 1rem;
    }

    .course-search__note {
      font-size: 0.875rem;
    }

    .course-item__header {
      min-height: 2.75rem;
      padding: 0.75rem;
    }

    .course-item__code {
      font-size: 0.9375rem;
    }

    .course-item__meta {
      font-size: 0.75rem;
    }

    .course-item__title {
      font-size: 0.8125rem;
    }

    .course-item__sections {
      gap: 0.5rem;
      padding: 0.5rem 0.75rem 0.75rem;
    }

    .section-row {
      gap: 0.75rem;
    }

    .section-row__name {
      font-size: 0.875rem;
    }

    .section-row__schedule {
      font-size: 0.8125rem;
    }

    /* 40px tall (border-box) instead of the 62px pill content-box sizing
       produced; still a comfortable tap target. */
    .section-row__toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 3.5rem;
      min-height: 2.5rem;
      padding: 0 0.875rem;
      font-size: 0.8125rem;
    }

    .course-search__hint {
      font-size: 0.875rem;
    }

    .course-search__chip {
      min-height: 2.25rem;
      display: inline-flex;
      align-items: center;
      font-size: 0.875rem;
    }

    .course-search__empty .course-search__more {
      margin-left: 0;
      min-height: 2.25rem;
      display: inline-flex;
      align-items: center;
      font-size: 0.875rem;
    }
  }

  /* The planner stacks this panel above the week grid below 48rem. Let its
     results take their natural height so the grid cannot paint over a course
     header and capture its tap. The planner body owns vertical scrolling. */
  @media (max-width: 48rem) {
    .course-search {
      min-height: auto;
    }

    .course-search__list {
      overflow-y: visible;
    }

    /* With the list unscrolled, sticky would pin the "Showing X of Y" note to
       the planner-body scrollport and paint it over course rows; keep it in
       flow at the end of the list instead. */
    .course-search__note {
      position: static;
      border-top: 0;
    }
  }
</style>
