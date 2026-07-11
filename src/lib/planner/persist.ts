import type { PlannedSection, PlannerPersisted, PlannerPlan } from "./types.js";
import { sectionNaturalKey } from "./types.js";

const isPlannedSection = (value: unknown): value is PlannedSection =>
  !!value &&
  typeof value === "object" &&
  typeof (value as PlannedSection).courseCode === "string" &&
  typeof (value as PlannedSection).section === "string" &&
  typeof (value as PlannedSection).type === "string" &&
  Array.isArray((value as PlannedSection).schedule) &&
  (value as PlannedSection).schedule.every((s) => typeof s === "string");

const isPlannerPlan = (value: unknown): value is PlannerPlan =>
  !!value &&
  typeof value === "object" &&
  typeof (value as PlannerPlan).id === "string" &&
  typeof (value as PlannerPlan).label === "string" &&
  typeof (value as PlannerPlan).termId === "number" &&
  Array.isArray((value as PlannerPlan).sections);

export const EMPTY_PLANNER: PlannerPersisted = {
  v: 1,
  plans: [],
  activePlanIdByTerm: {},
};

export function serializePlanner(
  state: Pick<PlannerPersisted, "plans" | "activePlanIdByTerm">,
): string {
  return JSON.stringify({
    v: 1,
    plans: state.plans,
    activePlanIdByTerm: state.activePlanIdByTerm,
  } satisfies PlannerPersisted);
}

/**
 * Union two planner states for account sync: keep every plan from both, with
 * the remote (account) version winning on a shared plan id. Prevents losing
 * local-only plans when a user signs in on a device that already has plans,
 * while treating the account copy as authoritative for plans it also has.
 */
export function mergePlannerState(
  local: Pick<PlannerPersisted, "plans" | "activePlanIdByTerm">,
  remote: Pick<PlannerPersisted, "plans" | "activePlanIdByTerm">,
): PlannerPersisted {
  const byId = new Map<string, PlannerPlan>();
  for (const plan of remote.plans) byId.set(plan.id, plan);
  for (const plan of local.plans)
    if (!byId.has(plan.id)) byId.set(plan.id, plan);
  const plans = [...byId.values()];
  const planIds = new Set(plans.map((p) => p.id));
  // Remote's active-plan choices win; keep local's for terms remote doesn't set.
  const activePlanIdByTerm: Record<string, string> = {};
  for (const [termId, planId] of Object.entries({
    ...local.activePlanIdByTerm,
    ...remote.activePlanIdByTerm,
  })) {
    if (planIds.has(planId)) activePlanIdByTerm[termId] = planId;
  }
  return { v: 1, plans, activePlanIdByTerm };
}

function sectionNoteKey(
  planId: string,
  section: Pick<PlannedSection, "courseCode" | "section" | "type">,
) {
  return `${planId}::${sectionNaturalKey(section)}`;
}

/** Collect professor/section notes for re-applying after account merge. */
export function collectSectionNotes(plans: PlannerPlan[]): Map<string, string> {
  const notes = new Map<string, string>();
  for (const plan of plans) {
    for (const section of plan.sections) {
      const trimmed = section.note?.trim();
      if (trimmed) notes.set(sectionNoteKey(plan.id, section), trimmed);
    }
  }
  return notes;
}

export function applySectionNotes(
  plans: PlannerPlan[],
  notes: Map<string, string>,
): PlannerPlan[] {
  if (notes.size === 0) return plans;
  return plans.map((plan) => ({
    ...plan,
    sections: plan.sections.map((section) => {
      const note = notes.get(sectionNoteKey(plan.id, section));
      return note ? { ...section, note } : section;
    }),
  }));
}

/** Account sync stores schedules only — instructor notes stay on this device. */
export function stripSectionNotesForAccount(
  state: Pick<PlannerPersisted, "plans" | "activePlanIdByTerm">,
): Pick<PlannerPersisted, "plans" | "activePlanIdByTerm"> {
  return {
    activePlanIdByTerm: state.activePlanIdByTerm,
    plans: state.plans.map((plan) => ({
      ...plan,
      sections: plan.sections.map(({ note: _note, ...section }) => section),
    })),
  };
}

/** Parse persisted planner state; invalid plans/sections are dropped, never fatal. */
export function parsePlanner(raw: string | null): PlannerPersisted {
  if (!raw) return { ...EMPTY_PLANNER };
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return { ...EMPTY_PLANNER };
    const persisted = data as PlannerPersisted;
    if (persisted.v !== 1 || !Array.isArray(persisted.plans)) {
      return { ...EMPTY_PLANNER };
    }
    const plans = persisted.plans.filter(isPlannerPlan).map((plan) => ({
      ...plan,
      sections: plan.sections.filter(isPlannedSection).map((s) => ({
        ...s,
        roomCode: s.roomCode ?? null,
        courseTitle: s.courseTitle ?? null,
      })),
    }));
    const planIds = new Set(plans.map((p) => p.id));
    const activePlanIdByTerm: Record<string, string> = {};
    if (
      persisted.activePlanIdByTerm &&
      typeof persisted.activePlanIdByTerm === "object"
    ) {
      for (const [termId, planId] of Object.entries(
        persisted.activePlanIdByTerm,
      )) {
        if (typeof planId === "string" && planIds.has(planId)) {
          activePlanIdByTerm[termId] = planId;
        }
      }
    }
    return { v: 1, plans, activePlanIdByTerm };
  } catch {
    return { ...EMPTY_PLANNER };
  }
}
