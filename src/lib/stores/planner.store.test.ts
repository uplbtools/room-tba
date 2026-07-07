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

  test("addOffering creates plan A and adds LEC+LAB together, deduped", () => {
    const store = makeStore();
    const rows = [
      row({}),
      row({ id: 2, type: "LAB", schedule: ["F 01:00PM-04:00PM"] }),
    ];
    store.addOffering(rows);
    store.addOffering(rows);
    expect(store.activePlan?.label).toBe("A");
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

  test("rows without natural key are skipped", () => {
    const store = makeStore();
    store.addOffering([row({ courseCode: null })]);
    expect(store.plans).toEqual([]);
  });

  test("plans are per term and labels cycle A, B", () => {
    const store = makeStore();
    store.addOffering([row({})]);
    const planB = store.createPlan();
    expect(planB?.label).toBe("B");
    expect(store.activePlan?.id).toBe(planB?.id);
    expect(store.plansForTerm).toHaveLength(2);
    store.addOffering([row({ id: 3, termId: 1253, courseCode: "MATH 27" })]);
    expect(store.plans.find((p) => p.termId === 1253)?.label).toBe("A");
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
    expect(rehydrated.activePlan?.label).toBe("A");
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
    expect(imported.label).toBe("B");
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
