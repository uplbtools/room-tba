import { beforeEach, describe, expect, test } from "vitest";
import { PlannerStore } from "./planner-store.svelte.js";
import { PLANNER_LS_KEY } from "./store-types.js";
import type { ClassMapValue } from "@lib/types";

const row = (overrides: Partial<ClassMapValue>): ClassMapValue => ({
  id: 1,
  courseCode: "CMSC 128",
  section: "AB-1L",
  type: "LEC",
  schedule: ["MW 07:00AM-08:00AM"],
  roomCode: "ICS MH1",
  directions: null,
  courseTitle: "Software Engineering",
  roomId: 1,
  termId: 1252,
  ...overrides,
});

describe("PlannerStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const makeStore = (termId: number | null = 1252) => {
    const store = new PlannerStore(() => termId);
    store.init();
    return store;
  };

  test("addOffering creates first plan and adds LEC+LAB together, deduped", () => {
    const store = makeStore();
    const rows = [
      row({}),
      row({ id: 2, type: "LAB", schedule: ["F 01:00PM-04:00PM"] }),
    ];
    store.addOffering(rows);
    store.addOffering(rows);
    expect(store.activePlan?.label).toBe("Plan 1");
    expect(store.activePlan?.sections).toHaveLength(2);
    expect(store.addedKeys.has("CMSC 128::AB-1L")).toBe(true);
  });

  test("removeOffering removes all section rows of the offering", () => {
    const store = makeStore();
    store.addOffering([row({}), row({ id: 2, type: "LAB" })]);
    store.removeOffering("CMSC 128", "AB-1L");
    expect(store.activePlan?.sections).toEqual([]);
    expect(store.addedKeys.size).toBe(0);
  });

  test("removeSections removes exact linked lecture and lab rows", () => {
    const store = makeStore();
    const rows = [
      row({ id: 1, section: "AB", type: "LEC" }),
      row({ id: 2, section: "AB-1L", type: "LAB" }),
    ];
    store.addOffering(rows);
    store.removeSections(rows);
    expect(store.activePlan?.sections).toEqual([]);
  });

  test("replaceCourse swaps every planned row of the course, labs included", () => {
    const store = makeStore();
    store.addOffering([
      row({ id: 1, section: "AB", type: "LEC" }),
      row({ id: 2, section: "AB-1L", type: "LAB" }),
    ]);
    store.replaceCourse("CMSC 128", [
      row({ id: 3, section: "CD", type: "LEC" }),
      row({ id: 4, section: "CD-2L", type: "LAB" }),
    ]);
    expect(store.activePlan?.sections.map((s) => s.section).sort()).toEqual([
      "CD",
      "CD-2L",
    ]);
  });

  test("rows without natural key are skipped", () => {
    const store = makeStore();
    store.addOffering([row({ courseCode: null })]);
    expect(store.plans).toEqual([]);
  });

  test("plans are per term and labels count up Plan 1, Plan 2", () => {
    const store = makeStore();
    store.addOffering([row({})]);
    const planB = store.createPlan();
    expect(planB?.label).toBe("Plan 2");
    expect(store.activePlan?.id).toBe(planB?.id);
    expect(store.plansForTerm).toHaveLength(2);
    store.addOffering([row({ id: 3, termId: 1253, courseCode: "MATH 27" })]);
    expect(store.plans.find((p) => p.termId === 1253)?.label).toBe("Plan 1");
    expect(store.plansForTerm).toHaveLength(2); // active term still 1252
  });

  test("selectPlan and deletePlan update the active pointer", () => {
    const store = makeStore();
    store.addOffering([row({})]);
    const planA = store.activePlan!;
    const planB = store.createPlan()!;
    store.selectPlan(planA.id);
    expect(store.activePlan?.id).toBe(planA.id);
    store.deletePlan(planA.id);
    expect(store.activePlan?.id).toBe(planB.id);
  });

  test("conflicts derive from the active plan", () => {
    const store = makeStore();
    store.addOffering([row({})]);
    store.addOffering([
      row({
        id: 9,
        courseCode: "MATH 27",
        section: "B-2",
        schedule: ["M 07:30AM-08:30AM"],
      }),
    ]);
    expect(store.conflicts).toHaveLength(1);
  });

  test("persists to localStorage and hydrates in a new instance", () => {
    const store = makeStore();
    store.addOffering([row({})]);
    expect(localStorage.getItem(PLANNER_LS_KEY)).toContain("CMSC 128");

    const rehydrated = makeStore();
    expect(rehydrated.activePlan?.sections).toHaveLength(1);
    expect(rehydrated.activePlan?.label).toBe("Plan 1");
  });

  test("importShared creates and selects a new plan", () => {
    const store = makeStore();
    store.addOffering([row({})]);
    const imported = store.importShared(1252, [
      {
        courseCode: "MATH 27",
        section: "B-2",
        type: "LEC",
        schedule: ["TBA"],
        roomCode: null,
        courseTitle: null,
      },
    ]);
    expect(store.activePlan?.id).toBe(imported.id);
    expect(imported.label).toBe("Plan 2");
  });

  test("refreshActivePlan updates matches and marks misses stale", () => {
    const store = makeStore();
    store.addOffering([row({}), row({ id: 2, type: "LAB" })]);
    store.refreshActivePlan([row({ roomCode: "NEW ROOM" })]);
    const sections = store.activePlan!.sections;
    expect(sections.find((s) => s.type === "LEC")?.roomCode).toBe("NEW ROOM");
    expect(sections.find((s) => s.type === "LAB")?.stale).toBe(true);
  });
});
