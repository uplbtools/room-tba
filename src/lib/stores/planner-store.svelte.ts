import { dismissEphemeralOverlays } from "../overlay-stack.js";
import { offeringGroupKey } from "../class-offering-groups.js";
import { findConflicts } from "../planner/conflicts.js";
import { parsePlanner, serializePlanner } from "../planner/persist.js";
import { sectionNaturalKey } from "../planner/types.js";
import type { PlannedSection, PlannerPlan } from "../planner/types.js";
import type { ClassMapValue } from "@lib/types";
import { PLANNER_LS_KEY } from "./store-types.js";

function rowToPlannedSection(row: ClassMapValue): PlannedSection | null {
  if (!row.courseCode || !row.section || !row.type) return null;
  return {
    courseCode: row.courseCode,
    section: row.section,
    type: row.type,
    schedule: row.schedule ?? ["TBA"],
    roomCode: row.roomCode ?? null,
    courseTitle: row.courseTitle ?? null,
  };
}

export class PlannerStore {
  open = $state(false);
  plans = $state<PlannerPlan[]>([]);
  activePlanIdByTerm = $state<Record<string, string>>({});
  private _hydrated = false;

  constructor(private getActiveTermId: () => number | null) {}

  activeTermId = $derived.by(() => this.getActiveTermId());

  plansForTerm = $derived(
    this.plans.filter((plan) => plan.termId === this.activeTermId),
  );

  activePlan = $derived.by(() => {
    if (this.activeTermId == null) return null;
    const activeId = this.activePlanIdByTerm[String(this.activeTermId)];
    return (
      this.plansForTerm.find((plan) => plan.id === activeId) ??
      this.plansForTerm[0] ??
      null
    );
  });

  /** offeringGroupKey(courseCode, section) for every offering in the active plan. */
  addedKeys = $derived(
    new Set(
      (this.activePlan?.sections ?? [])
        .map((s) => offeringGroupKey(s.courseCode, s.section))
        .filter((key): key is string => key !== null),
    ),
  );

  conflicts = $derived(findConflicts(this.activePlan?.sections ?? []));

  init = () => {
    if (this._hydrated) return;
    this._hydrated = true;
    const state = parsePlanner(localStorage.getItem(PLANNER_LS_KEY));
    this.plans = state.plans;
    this.activePlanIdByTerm = state.activePlanIdByTerm;
  };

  openPlanner = () => {
    dismissEphemeralOverlays();
    this.open = true;
  };

  close = () => {
    this.open = false;
  };

  /** Add every LEC/LAB row of one offering group. Rows without a natural key are skipped. */
  addOffering = (rows: ClassMapValue[]) => {
    const sections = rows
      .map(rowToPlannedSection)
      .filter((s): s is PlannedSection => s !== null);
    if (sections.length === 0) return;
    const termId = rows[0].termId ?? this.activeTermId;
    if (termId == null) return;

    const plan = this.ensurePlanForTerm(termId);
    const existing = new Set(plan.sections.map(sectionNaturalKey));
    for (const section of sections) {
      if (!existing.has(sectionNaturalKey(section))) {
        plan.sections.push(section);
      }
    }
    this.persist();
  };

  removeSections = (rows: ClassMapValue[]) => {
    const plan = this.activePlan;
    if (!plan) return;
    const removeKeys = new Set(
      rows
        .map(rowToPlannedSection)
        .filter((s): s is PlannedSection => s !== null)
        .map(sectionNaturalKey),
    );
    if (removeKeys.size === 0) return;
    plan.sections = plan.sections.filter(
      (section) => !removeKeys.has(sectionNaturalKey(section)),
    );
    this.persist();
  };

  /** Swap a course to another section: drop every planned row of the course, add the new offering. */
  replaceCourse = (courseCode: string, rows: ClassMapValue[]) => {
    // Only prune when a plan already exists; addOffering lazily creates the
    // plan for the term, so the first add (no active plan yet) must not bail.
    const plan = this.activePlan;
    if (plan) {
      plan.sections = plan.sections.filter((s) => s.courseCode !== courseCode);
    }
    this.addOffering(rows);
    this.persist();
  };

  removeOffering = (courseCode: string, section: string) => {
    const plan = this.activePlan;
    if (!plan) return;
    const key = offeringGroupKey(courseCode, section);
    plan.sections = plan.sections.filter(
      (s) => offeringGroupKey(s.courseCode, s.section) !== key,
    );
    this.persist();
  };

  createPlan = (): PlannerPlan | null => {
    if (this.activeTermId == null) return null;
    const plan = this.newPlan(this.activeTermId);
    this.plans.push(plan);
    this.selectPlan(plan.id);
    return plan;
  };

  deletePlan = (id: string) => {
    this.plans = this.plans.filter((plan) => plan.id !== id);
    for (const [termId, planId] of Object.entries(this.activePlanIdByTerm)) {
      if (planId === id) delete this.activePlanIdByTerm[termId];
    }
    this.persist();
  };

  selectPlan = (id: string) => {
    const plan = this.plans.find((p) => p.id === id);
    if (!plan) return;
    this.activePlanIdByTerm[String(plan.termId)] = id;
    this.persist();
  };

  /** Add a decoded share payload as a new plan for its term and select it. */
  importShared = (termId: number, sections: PlannedSection[]): PlannerPlan => {
    const plan = this.newPlan(termId);
    plan.sections = sections;
    this.plans.push(plan);
    this.activePlanIdByTerm[String(termId)] = plan.id;
    this.persist();
    return plan;
  };

  /** Overwrite matching sections with fresh rows; mark unresolved ones stale. */
  refreshActivePlan = (rows: ClassMapValue[]) => {
    const plan = this.activePlan;
    if (!plan) return;
    const fresh = new Map(
      rows
        .map(rowToPlannedSection)
        .filter((s): s is PlannedSection => s !== null)
        .map((s) => [sectionNaturalKey(s), s]),
    );
    plan.sections = plan.sections.map((section) => {
      const updated = fresh.get(sectionNaturalKey(section));
      return updated ?? { ...section, stale: true };
    });
    this.persist();
  };

  private ensurePlanForTerm(termId: number): PlannerPlan {
    const activeId = this.activePlanIdByTerm[String(termId)];
    const existing =
      this.plans.find((p) => p.id === activeId && p.termId === termId) ??
      this.plans.find((p) => p.termId === termId);
    if (existing) {
      this.activePlanIdByTerm[String(termId)] = existing.id;
      return existing;
    }
    const plan = this.newPlan(termId);
    this.plans.push(plan);
    this.activePlanIdByTerm[String(termId)] = plan.id;
    return plan;
  }

  private newPlan(termId: number): PlannerPlan {
    const used = new Set(
      this.plans.filter((p) => p.termId === termId).map((p) => p.label),
    );
    let n = 1;
    while (used.has(`Plan ${n}`)) n++;
    return {
      id: crypto.randomUUID(),
      label: `Plan ${n}`,
      termId,
      sections: [],
    };
  }

  private persist() {
    try {
      localStorage.setItem(
        PLANNER_LS_KEY,
        serializePlanner({
          plans: this.plans,
          activePlanIdByTerm: this.activePlanIdByTerm,
        }),
      );
    } catch {
      // localStorage may be unavailable (private mode); plan still works
      // for the current session.
    }
  }
}
