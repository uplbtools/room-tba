import { type RouteSchedule, routeSchedule } from "@constants/jeepney-routes";

/** Shown wherever a schedule is missing; never a made-up number. */
export const SCHEDULE_NOT_PUBLISHED = "Schedule not published";

export type ScheduleSummary = {
  /** False when nothing is known; `hours` then reads SCHEDULE_NOT_PUBLISHED. */
  published: boolean;
  /** "Daily, 5:00 AM" or "Daily, about 4:00 AM to about 10:00 PM". */
  hours: string;
  /** "Every 10 min", "1 trip a day", or "Frequency not published". */
  frequency: string;
  note: string | null;
};

export function summarizeSchedule(
  schedule: RouteSchedule | null,
): ScheduleSummary {
  if (!schedule) {
    return {
      published: false,
      hours: SCHEDULE_NOT_PUBLISHED,
      frequency: "Frequency not published",
      note: null,
    };
  }
  const trips = schedule.departures?.length ?? 0;
  const times =
    trips > 0
      ? schedule.departures!.join(", ")
      : schedule.hours
        ? `${schedule.hours.first} to ${schedule.hours.last}`
        : "hours not published";
  const frequency = schedule.headwayMinutes
    ? `Every ${schedule.headwayMinutes} min`
    : trips > 0
      ? `${trips} trip${trips === 1 ? "" : "s"} a day`
      : "Frequency not published";
  return {
    published: true,
    hours: `${schedule.days}, ${times}`,
    frequency,
    note: schedule.note ?? null,
  };
}

export function routeScheduleSummary(routeId: string): ScheduleSummary {
  return summarizeSchedule(routeSchedule(routeId));
}
