import {
  formatCampusDateShort,
  formatCampusTime,
  instantToCampusWallString,
} from "./event-time";
import { eventPlacementStore } from "./store.svelte";

function defaultEventTitle(startsAt: Date) {
  const label = `${formatCampusDateShort(startsAt.toISOString())}, ${formatCampusTime(startsAt.toISOString())}`;
  return `Untitled campus event ${label}`;
}

export function beginEventPlacement(
  options: { propose?: boolean; submitterName?: string } = {},
) {
  if (eventPlacementStore.active || eventPlacementStore.creating) return false;

  const now = Date.now();
  const startsAt = new Date(now + 60 * 60 * 1000);
  const endsAt = new Date(now + 2 * 60 * 60 * 1000);

  eventPlacementStore.start(
    {
      slug: `draft-event-${now}`,
      title: defaultEventTitle(startsAt),
      startsAt: instantToCampusWallString(startsAt),
      endsAt: instantToCampusWallString(endsAt),
      category: "other",
      imageUrl: null,
    },
    {
      propose: options.propose ?? false,
      submitterName: options.submitterName?.trim() ?? "",
    },
  );

  return true;
}
