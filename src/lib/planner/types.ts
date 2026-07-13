// Planner data model (#planner). Persisted refs use the natural key
// termId + courseCode + section + type — DB row ids churn on --replace-term
// reimports, so they are never stored.

export type PlannedSection = {
  courseCode: string;
  section: string;
  type: string; // "LEC" | "LAB" | "SEM"
  /** Snapshot of AMIS schedule strings, e.g. ["MW 07:00AM-08:00AM"] or ["TBA"]. */
  schedule: string[];
  roomCode: string | null;
  courseTitle: string | null;
  /** Natural key no longer resolves after a term reimport. */
  stale?: boolean;
  /** Instructor / section reminder — synced to an account when signed in. */
  note?: string;
};

export type PlannerPlan = {
  /** crypto.randomUUID() — stable identity for future account sync. */
  id: string;
  /** Display label, "A" | "B" | "C" | … */
  label: string;
  termId: number;
  sections: PlannedSection[];
};

export type PlannerPersisted = {
  v: 1;
  plans: PlannerPlan[];
  /** termId (stringified) -> active plan id */
  activePlanIdByTerm: Record<string, string>;
};

export function sectionNaturalKey(section: {
  courseCode: string;
  section: string;
  type: string;
}): string {
  return `${section.courseCode}::${section.section}::${section.type}`;
}
