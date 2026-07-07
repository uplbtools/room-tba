import {
  groupClassesByOffering,
  type ClassOfferingGroup,
} from "../class-offering-groups.js";
import type { ClassMapValue } from "@lib/types";

/**
 * Other sections of one course a planner block can be dragged onto (#506).
 * Same course code, excluding the section already on the grid and unkeyed
 * solo rows. Fed by the class rows PlannerScreen already loads per plan.
 */
export function alternativeOfferings(
  rows: ClassMapValue[],
  courseCode: string,
  currentSection: string,
): ClassOfferingGroup[] {
  return groupClassesByOffering(rows).filter(
    (o) =>
      !o.key.startsWith("__solo__") &&
      o.courseCode === courseCode &&
      o.section !== currentSection,
  );
}
