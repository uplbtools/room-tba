import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import type { EventData } from "@lib/types";
import EventsListHost from "@test/components/EventsListHost.svelte";

function event(
  id: number,
  title: string,
  status: EventData["status"],
  startsAt: string,
): EventData {
  return {
    id,
    slug: `event-${id}`,
    title,
    status,
    imageUrl: null,
    occurrenceStartsAt: startsAt,
    occurrenceEndsAt: startsAt,
    locations: [],
    routes: [],
  } as unknown as EventData;
}

describe("EventsList", () => {
  test("upcoming events come first; past ones follow, labelled Past", () => {
    render(EventsListHost, {
      props: {
        events: [
          event(1, "Old Fair", "past", "2026-08-01T10:00:00Z"),
          event(2, "Next Week Talk", "upcoming", "2026-10-14T10:00:00Z"),
          event(3, "Live Concert", "active", "2026-10-07T10:00:00Z"),
        ],
      },
    });

    const upcoming = screen.getByRole("region", { name: "Upcoming" });
    const titles = within(upcoming)
      .getAllByRole("button", { name: /^Open .+ details$/ })
      .map((button) => button.getAttribute("aria-label"));
    expect(titles).toEqual([
      "Open Live Concert details",
      "Open Next Week Talk details",
    ]);

    const past = screen.getByRole("region", { name: "Past events" });
    expect(within(past).getByText("Old Fair")).toBeInTheDocument();
    expect(within(past).getByText("Past")).toBeInTheDocument();
    // The list closes from the search bar's X, not a second close button.
    expect(screen.queryByRole("button", { name: /close/i })).toBeNull();
  });

  test("says clearly when nothing is upcoming, and still lists the past", () => {
    render(EventsListHost, {
      props: {
        events: [event(1, "Old Fair", "past", "2026-08-01T10:00:00Z")],
      },
    });
    expect(
      screen.getByText("No upcoming campus events right now. Check back soon."),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Past events" })).getByText(
        "Old Fair",
      ),
    ).toBeInTheDocument();
  });
});
