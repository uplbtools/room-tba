<script lang="ts">
  import { plannerStore, queryStore, toastStore } from "@lib/store.svelte";
  import {
    groupClassesByOffering,
    offeringGroupKey,
  } from "@lib/class-offering-groups";
  import type { ClassOfferingGroup } from "@lib/class-offering-groups";
  import type { ClassMapValue } from "@lib/types";

  interface Props {
    classes: ClassMapValue[];
    currentRoomCode?: string | null;
  }

  const { classes, currentRoomCode = null }: Props = $props();

  const groups = $derived(groupClassesByOffering(classes));

  function openRoom(roomCode: string | null | undefined) {
    if (!roomCode) return;
    queryStore.updateQuery({
      type: "result",
      category: "room",
      value: roomCode,
    });
    queryStore.inputValue = roomCode;
  }

  function formatSchedule(schedule: string[] | null): string {
    if (!schedule?.length) return "Schedule TBA";
    return schedule.join(" · ");
  }

  function planKey(group: ClassOfferingGroup): string | null {
    if (group.key.startsWith("__solo__")) return null;
    return offeringGroupKey(group.courseCode, group.section);
  }

  function togglePlan(group: ClassOfferingGroup) {
    const key = planKey(group);
    if (!key) return;
    if (plannerStore.addedKeys.has(key)) {
      plannerStore.removeOffering(group.courseCode, group.section);
    } else {
      plannerStore.addOffering(group.sections);
      toastStore.show(
        `${group.courseCode} ${group.section} added to ${plannerStore.activePlan?.label ?? "plan"}`,
        "success",
      );
    }
  }
</script>

<div class="class-list">
  {#each groups as group (group.key)}
    <section
      class="class-offering"
      class:class-offering--multi={group.sections.length > 1}
      aria-label="{group.courseCode} section {group.section}"
    >
      <header class="class-offering__header">
        <div class="class-offering__heading">
          <div class="class-offering__title">{group.courseCode}</div>
          {#if planKey(group)}
            {@const added = plannerStore.addedKeys.has(planKey(group) ?? "")}
            <button
              type="button"
              class="class-offering__plan"
              class:class-offering__plan--added={added}
              onclick={() => togglePlan(group)}
            >
              {added ? "In plan ✓" : "Add to plan"}
            </button>
          {/if}
        </div>
        {#if group.courseTitle}
          <div class="class-offering__subtitle">{group.courseTitle}</div>
        {/if}
        <div class="class-offering__section">Section {group.section}</div>
      </header>

      <div class="class-offering__sections">
        {#each group.sections as sectionClass (sectionClass.id)}
          {@const showRoomLink =
            sectionClass.roomCode &&
            (!currentRoomCode || sectionClass.roomCode !== currentRoomCode)}
          <article class="class-section-row">
            <div class="class-section-row__main">
              <div class="class-section-row__type">
                {sectionClass.type ?? "Class"}
                {#if showRoomLink && sectionClass.roomCode}
                  <span class="class-section-row__room">
                    in {sectionClass.roomCode}
                  </span>
                {/if}
              </div>
              <div class="class-section-row__schedule">
                {formatSchedule(sectionClass.schedule)}
              </div>
            </div>
            {#if showRoomLink && sectionClass.roomCode}
              <button
                type="button"
                class="class-section-row__open"
                onclick={() => openRoom(sectionClass.roomCode)}
              >
                Open room
              </button>
            {/if}
          </article>
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .class-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin: 0.5rem 0;
  }

  .class-offering {
    border: 1px solid hsl(0, 0%, 88%);
    border-radius: 0.5rem;
    background: hsl(0, 0%, 98%);
    overflow: hidden;
  }

  .class-offering--multi {
    border-color: hsl(5, 35%, 82%);
    box-shadow: inset 3px 0 0 hsl(5, 53%, 42%);
  }

  .class-offering__header {
    padding: 0.625rem 0.75rem 0.375rem;
    border-bottom: 1px solid hsl(0, 0%, 92%);
  }

  .class-offering__heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .class-offering__title {
    font-weight: 600;
    font-size: 0.9375rem;
    color: #111;
  }

  .class-offering__plan {
    flex-shrink: 0;
    border: 1px solid hsl(5, 53%, 82%);
    border-radius: 999px;
    background: white;
    color: hsl(5, 53%, 32%);
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.25rem 0.625rem;
    cursor: pointer;
  }

  .class-offering__plan:hover {
    background: hsl(5, 53%, 96%);
  }

  .class-offering__plan--added {
    background: hsl(5, 53%, 32%);
    border-color: hsl(5, 53%, 32%);
    color: white;
  }

  .class-offering__plan--added:hover {
    background: hsl(5, 53%, 26%);
  }

  .class-offering__subtitle {
    margin-top: 0.125rem;
    color: #555;
    font-size: 0.8125rem;
    line-height: 1.35;
  }

  .class-offering__section {
    margin-top: 0.25rem;
    color: #777;
    font-size: 0.75rem;
  }

  .class-offering__sections {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem 0.625rem;
  }

  .class-section-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border-radius: 0.375rem;
    background: white;
    border: 1px solid hsl(0, 0%, 92%);
  }

  .class-section-row__main {
    min-width: 0;
    flex: 1;
  }

  .class-section-row__type {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #222;
  }

  .class-section-row__room {
    margin-left: 0.25rem;
    font-weight: 500;
    color: #666;
  }

  .class-section-row__schedule {
    margin-top: 0.125rem;
    font-size: 0.75rem;
    color: #555;
    line-height: 1.35;
  }

  .class-section-row__open {
    flex-shrink: 0;
    border: 1px solid hsl(5, 53%, 82%);
    border-radius: 999px;
    background: white;
    color: hsl(5, 53%, 32%);
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.25rem 0.625rem;
    cursor: pointer;
  }

  .class-section-row__open:hover {
    background: hsl(5, 53%, 96%);
  }
</style>
