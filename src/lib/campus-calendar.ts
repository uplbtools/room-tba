import type { EventRecurrence } from "./event-time";

export type SemesterRecurrence = Extract<
  EventRecurrence,
  "every_1st_sem" | "every_2nd_sem"
>;

/**
 * Campus semester month windows for recurrence projection.
 * Update these when the official UP academic calendar changes.
 */
export const CAMPUS_SEMESTER_MONTHS: Record<
  SemesterRecurrence,
  readonly number[]
> = {
  every_1st_sem: [8, 9, 10, 11, 12],
  every_2nd_sem: [1, 2, 3, 4, 5],
};
