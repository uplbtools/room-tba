import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import AcademicCalendarScreenHost from "@test/components/AcademicCalendarScreenHost.svelte";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";
import { EVENT_MARKER_STEP_PCT } from "@lib/academic-calendar";
import { appBootstrapStore, termStore } from "@lib/store.svelte";
import type { EventData, TermWithCount } from "@lib/types";

// Windows are placed around the real clock so the screen's "today" snapshot
// lands inside term B without mocking Date.
const DAY_MS = 86_400_000;
const manilaKey = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * DAY_MS).toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });
const manilaNoon = (offsetDays: number) =>
  new Date(`${manilaKey(offsetDays)}T12:00:00+08:00`).toISOString();

const term = (
  id: number,
  overrides: Partial<TermWithCount> = {},
): TermWithCount => ({
  id,
  label: `Term ${id}`,
  schoolYear: "2098-2099",
  semester: null,
  startsOn: null,
  endsOn: null,
  isDefault: false,
  isActive: true,
  sortOrder: id,
  classesImportedAt: null,
  version: 1,
  updatedAt: "2026-01-01",
  classCount: 0,
  ...overrides,
});

const event = (id: number, overrides: Partial<EventData> = {}): EventData => ({
  id,
  slug: `event-${id}`,
  title: `Event ${id}`,
  description: null,
  category: "fair",
  startsAt: manilaNoon(0),
  endsAt: manilaNoon(0),
  timezone: "Asia/Manila",
  recurrence: "none",
  isActive: true,
  sourceUrl: null,
  imageUrl: null,
  priority: 0,
  includeInSeo: false,
  version: 1,
  updatedAt: "2026-01-01",
  status: "upcoming",
  occurrenceStartsAt: manilaNoon(0),
  occurrenceEndsAt: manilaNoon(0),
  locations: [],
  routes: [],
  ...overrides,
});

const markerLefts = () =>
  [...document.querySelectorAll<HTMLElement>(".acal-event-dot")]
    .map((dot) => Number.parseFloat(dot.style.left))
    .sort((a, b) => a - b);

describe("AcademicCalendarScreen", () => {
  beforeEach(() => {
    termStore.terms = [
      term(9001, {
        startsOn: manilaKey(-120),
        endsOn: manilaKey(-60),
        semester: "1",
        classCount: 1200,
      }),
      term(9002, {
        startsOn: manilaKey(-10),
        endsOn: manilaKey(50),
        semester: "2",
        classCount: 3400,
      }),
      term(9003, { semester: "midyear" }),
    ];
    termStore.loaded = true;
    appBootstrapStore.complete();
  });

  test("renders a dialog with the year strip, today marker, and in-session highlight", () => {
    render(AcademicCalendarScreenHost);
    expect(
      screen.getByRole("dialog", { name: "Academic Calendar" }),
    ).toBeTruthy();

    const segments = document.querySelectorAll(".acal-seg");
    expect(segments).toHaveLength(2); // 9003 has no dates anywhere
    expect(document.querySelector(".acal-seg--past")?.textContent).toContain(
      "1st sem",
    );
    expect(
      document.querySelector(".acal-seg--in-session")?.textContent,
    ).toContain("2nd sem");
    expect(document.querySelector(".acal-today")).toBeTruthy();
  });

  test("lists every active term with CRS id, date range, class count, and status", () => {
    render(AcademicCalendarScreenHost);
    const cards = [...document.querySelectorAll(".acal-card")];
    expect(cards).toHaveLength(3);

    const inSession = cards.find((card) =>
      card.textContent?.includes("CRS 9002"),
    );
    expect(inSession?.textContent).toContain("In session");
    expect(inSession?.textContent).toContain("3400 classes campus-wide");
    expect(inSession?.classList.contains("acal-card--current")).toBe(true);

    const undated = cards.find((card) =>
      card.textContent?.includes("CRS 9003"),
    );
    expect(undated?.textContent).toContain("Dates TBA");
  });

  test("shows the community-data disclaimer", () => {
    render(AcademicCalendarScreenHost);
    expect(screen.getByRole("note").textContent).toContain(
      "official UPLB academic calendar",
    );
  });

  test("lists in-range events with date, category, and recurrence", () => {
    render(AcademicCalendarScreenHost, {
      props: {
        events: [
          event(1, { title: "Lantern Parade", recurrence: "annual" }),
          event(2, {
            title: "Feb Fair",
            category: "fair",
            occurrenceStartsAt: manilaNoon(20),
            occurrenceEndsAt: manilaNoon(22),
          }),
        ],
      },
    });

    const rows = [...document.querySelectorAll(".acal-event")];
    expect(
      rows.map((row) => row.querySelector(".acal-event__title")?.textContent),
    ).toEqual(["Lantern Parade", "Feb Fair"]);
    expect(rows[0]?.textContent).toContain("fair");
    expect(rows[0]?.textContent).toContain("Repeats yearly");
    expect(
      document.querySelectorAll(".acal-events__month").length,
    ).toBeGreaterThanOrEqual(1);
  });

  test("collapses a same-day pile into one counted marker", () => {
    render(AcademicCalendarScreenHost, {
      props: { events: Array.from({ length: 12 }, (_, i) => event(i + 1)) },
    });

    const dots = document.querySelectorAll(".acal-event-dot");
    expect(dots).toHaveLength(1);
    expect(dots[0]?.textContent?.trim()).toBe("12");
    expect(document.querySelectorAll(".acal-event")).toHaveLength(12);
  });

  test("keeps markers a full grid step apart when events are spread out", () => {
    render(AcademicCalendarScreenHost, {
      props: {
        events: Array.from({ length: 40 }, (_, i) =>
          event(i + 1, {
            occurrenceStartsAt: manilaNoon(i - 20),
            occurrenceEndsAt: manilaNoon(i - 20),
          }),
        ),
      },
    });

    const lefts = markerLefts();
    expect(lefts.length).toBeGreaterThan(1);
    for (const [index, left] of lefts.entries()) {
      expect(left).toBeGreaterThanOrEqual(EVENT_MARKER_STEP_PCT / 2);
      expect(left).toBeLessThanOrEqual(100 - EVENT_MARKER_STEP_PCT / 2);
      const previous = lefts[index - 1];
      if (previous !== undefined) {
        expect(left - previous).toBeGreaterThanOrEqual(EVENT_MARKER_STEP_PCT);
      }
    }
  });

  test("explains events that fall outside the academic year", () => {
    render(AcademicCalendarScreenHost, {
      props: {
        events: [
          event(1, {
            occurrenceStartsAt: manilaNoon(900),
            occurrenceEndsAt: manilaNoon(900),
          }),
        ],
      },
    });

    expect(document.querySelectorAll(".acal-event-dot")).toHaveLength(0);
    expect(document.querySelector(".acal-events")?.textContent).toContain(
      "outside",
    );
    expect(
      screen.getByRole("button", { name: "See all campus events" }),
    ).toBeTruthy();
  });

  test("says so plainly when no event lands in the year", () => {
    render(AcademicCalendarScreenHost);
    expect(document.querySelector(".acal-events")?.textContent).toContain(
      "No campus events fall inside",
    );
  });

  test("waits for the campus bootstrap before claiming there are no events", () => {
    appBootstrapStore.beginRemote();
    render(AcademicCalendarScreenHost);
    expect(document.querySelector(".acal-events")?.textContent).toContain(
      "Loading campus events…",
    );
  });

  test("@320px: no horizontal overflow with a dense event month", () => {
    mountAtWidth(320);
    const { container } = render(AcademicCalendarScreenHost, {
      props: {
        events: Array.from({ length: 30 }, (_, i) =>
          event(i + 1, {
            title: `Extremely long campus event title number ${i + 1}`,
            occurrenceStartsAt: manilaNoon(i - 10),
            occurrenceEndsAt: manilaNoon(i - 10),
          }),
        ),
      },
    });

    expectNoHorizontalOverflow(container);
    const screenEl = container.querySelector<HTMLElement>(".acal-screen");
    if (screenEl) expectNoHorizontalOverflow(screenEl);
  });
});
