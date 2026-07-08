<script lang="ts">
  import Search from "@lucide/svelte/icons/search";
  import { SvelteSet } from "svelte/reactivity";
  import { fetchClassPage } from "@lib/classes-api";
  import {
    groupClassesByOffering,
    offeringGroupKey,
    type ClassOfferingGroup,
  } from "@lib/class-offering-groups";
  import { plannerStore, termStore, toastStore } from "@lib/store.svelte";
  import type { ClassMapValue } from "@lib/types";

  const termId = $derived(
    plannerStore.activePlan?.termId ?? termStore.activeTermId,
  );

  let query = $state("");
  let loading = $state(false);
  let rows = $state<ClassMapValue[]>([]);
  let total = $state(0);
  const expanded = new SvelteSet<string>();

  $effect(() => {
    const q = query.trim();
    const t = termId;
    const timer = setTimeout(
      () => {
        loading = true;
        fetchClassPage({
          termId: t,
          courseCodePrefix: q || undefined,
          limit: 100,
        })
          .then((page) => {
            rows = page.rows;
            total = page.total;
          })
          .catch(() => {
            rows = [];
            total = 0;
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
    courseCode: string;
    title: string | null;
    offerings: ClassOfferingGroup[];
  };

  const courses = $derived.by(() => {
    const byCourse = new Map<string, CourseGroup>();
    for (const offering of groupClassesByOffering(rows)) {
      if (offering.key.startsWith("__solo__")) continue;
      let course = byCourse.get(offering.courseCode);
      if (!course) {
        course = {
          courseCode: offering.courseCode,
          title: offering.courseTitle,
          offerings: [],
        };
        byCourse.set(offering.courseCode, course);
      }
      if (!course.title && offering.courseTitle) {
        course.title = offering.courseTitle;
      }
      course.offerings.push(offering);
    }
    return [...byCourse.values()];
  });

  function selectedCount(course: CourseGroup): number {
    return course.offerings.filter((o) =>
      plannerStore.addedKeys.has(
        offeringGroupKey(o.courseCode, o.section) ?? "",
      ),
    ).length;
  }

  function toggleExpanded(courseCode: string) {
    if (expanded.has(courseCode)) expanded.delete(courseCode);
    else expanded.add(courseCode);
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
      toastStore.show(
        `${offering.courseCode} ${offering.section} added to ${plannerStore.activePlan?.label ?? "plan"}`,
        "success",
      );
    }
  }

  function offeringSchedule(offering: ClassOfferingGroup): string {
    const parts = offering.sections.map((s) => {
      const sched = s.schedule?.length ? s.schedule.join(", ") : "TBA";
      return `${s.type ?? "Class"} ${sched}`;
    });
    return parts.join(" · ");
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

  {#if loading}
    <p class="course-search__note">Searching…</p>
  {:else if courses.length === 0}
    <p class="course-search__note">
      {query.trim() ? "No courses found this term." : "No classes this term."}
    </p>
  {:else}
    <div class="course-search__list">
      <div class="course-search__list-container">
        {#each courses as course (course.courseCode)}
          {@const picked = selectedCount(course)}
          <div class="course-item">
            <button
              type="button"
              class="course-item__header"
              aria-expanded={expanded.has(course.courseCode)}
              onclick={() => toggleExpanded(course.courseCode)}
            >
              <span class="course-item__code">{course.courseCode}</span>
              <span class="course-item__meta">
                {#if picked > 0}
                  <span class="course-item__picked">{picked} in plan</span>
                {/if}
                {course.offerings.length}
                section{course.offerings.length === 1 ? "" : "s"}
              </span>
              {#if course.title}
                <span class="course-item__title">{course.title}</span>
              {/if}
            </button>
            {#if expanded.has(course.courseCode)}
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
                      <span class="section-row__schedule">
                        {offeringSchedule(offering)}
                      </span>
                    </div>
                    <button
                      type="button"
                      class="section-row__toggle"
                      class:section-row__toggle--added={added}
                      onclick={() => togglePlan(offering)}
                    >
                      {added ? "✓" : "Add"}
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    {#if rows.length < total}
      <p class="course-search__note">
        Showing {rows.length} of {total} sections. Search a course code to find
        the rest.
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
    border: 1px solid hsl(0, 0%, 85%);
    border-radius: 0.5rem;
    background: white;
    color: hsl(0, 0%, 45%);
    flex: 0 0 auto;
  }

  .course-search__box:focus-within {
    border-color: hsl(5, 53%, 42%);
  }

  .course-search__box input {
    all: unset;
    flex: 1;
    min-width: 0;
    font-size: 0.8125rem;
    color: hsl(0, 0%, 15%);
  }

  .course-search__note {
    position: sticky;
    bottom: 0;
    margin: 0;
    padding: 0.5rem 0.375rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: hsl(0, 0%, 28%);
    background: hsl(0, 0%, 100%);
    border-top: 1px solid hsl(0, 0%, 90%);
  }

  .course-search__list {
    margin: 0;
    padding: 0;
    gap: 0.375rem;
    overflow-y: auto;
    min-height: 0;
  }

  .course-search__list-container {
      display:flex;
      flex-direction: column;
      gap:.375rem;
  }

  .course-item {
    border: 1px solid hsl(0, 0%, 90%);
    border-radius: 0.5rem;
    background: white;
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
    background: hsl(5, 53%, 98%);
  }

  .course-item__code {
    font-size: 0.8125rem;
    font-weight: 700;
    color: hsl(0, 0%, 12%);
  }

  .course-item__meta {
    float: right;
    font-size: 0.6875rem;
    color: hsl(0, 0%, 50%);
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }

  .course-item__picked {
    padding: 0.0625rem 0.375rem;
    border-radius: 999px;
    background: hsl(140, 60%, 94%);
    color: hsl(140, 60%, 25%);
    font-weight: 700;
  }

  .course-item__title {
    display: block;
    margin-top: 0.125rem;
    font-size: 0.75rem;
    color: hsl(0, 0%, 40%);
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
    border-top: 1px solid hsl(0, 0%, 93%);
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
    color: hsl(0, 0%, 20%);
  }

  .section-row__schedule {
    font-size: 0.6875rem;
    color: hsl(0, 0%, 45%);
  }

  .section-row__toggle {
    all: unset;
    flex-shrink: 0;
    min-width: 2rem;
    padding: 0.1875rem 0.5rem;
    border: 1px solid hsl(5, 53%, 82%);
    border-radius: 999px;
    text-align: center;
    font-size: 0.6875rem;
    font-weight: 600;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
  }

  .section-row__toggle:hover,
  .section-row__toggle:focus-visible {
    background: hsl(5, 53%, 96%);
  }

  .section-row__toggle--added {
    background: hsl(5, 53%, 32%);
    border-color: hsl(5, 53%, 32%);
    color: white;
  }
</style>
