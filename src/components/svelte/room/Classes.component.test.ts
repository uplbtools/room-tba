import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import Classes from "./Classes.svelte";
import { mountAtWidth } from "@test/layout-assertions";
import type { ClassMapValue } from "@lib/types";

const roomlessClass: ClassMapValue = {
  id: 1,
  termId: 1252,
  roomId: null,
  courseCode: "CMSC 199",
  roomCode: null,
  section: "A",
  type: "THE",
  schedule: [],
  directions: null,
  courseTitle: "Undergraduate Thesis",
};

const tbaLecture: ClassMapValue = {
  id: 2,
  termId: 1252,
  roomId: null,
  courseCode: "CMSC 128",
  roomCode: null,
  section: "B",
  type: "LEC",
  schedule: ["TTh 10:00AM-11:00AM"],
  directions: null,
  courseTitle: "Software Engineering",
};

describe("Classes", () => {
  test("shows human label and no assigned room at 320px", () => {
    mountAtWidth(320);
    render(Classes, { classes: [roomlessClass] });

    expect(screen.getByText("Thesis")).toBeVisible();
    expect(screen.getByText(/No assigned room/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Open room" })).toBeNull();
  });

  test("renders the probable-location hint for a Room TBA section (#846)", () => {
    mountAtWidth(320);
    render(Classes, {
      classes: [
        {
          ...tbaLecture,
          probableLocation: {
            source: "department",
            deptName: "Institute of Computer Science",
            collegeCode: "CAS",
            orgName: "Institute of Computer Science (ICS)",
          },
        },
      ],
    });

    expect(
      screen.getByText("Offered by Institute of Computer Science (CAS)"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Show probable location of CMSC 128 B on the map",
      }),
    ).toBeVisible();
  });

  test("hedges with the modal building for history-sourced hints (#846)", () => {
    mountAtWidth(320);
    render(Classes, {
      classes: [
        {
          ...tbaLecture,
          probableLocation: {
            source: "course-history",
            collegeCode: "CAS",
            buildingId: 7,
            buildingName: "Physical Sciences Building",
          },
        },
      ],
    });

    expect(
      screen.getByText("Usually meets around Physical Sciences Building"),
    ).toBeVisible();
    // No decoded department: no "Offered by" line.
    expect(screen.queryByText(/Offered by/)).toBeNull();
  });

  test("shows no hint or pin for assigned sections and hint-less rows", () => {
    mountAtWidth(320);
    render(Classes, {
      classes: [
        { ...tbaLecture, id: 3, roomId: 9, roomCode: "ICS MH3" },
        roomlessClass,
      ],
    });

    expect(screen.queryByText(/Usually meets around|Offered by/)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Show probable location/ }),
    ).toBeNull();
  });
});
