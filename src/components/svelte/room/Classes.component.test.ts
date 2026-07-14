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

describe("Classes", () => {
  test("shows human label and no assigned room at 320px", () => {
    mountAtWidth(320);
    render(Classes, { classes: [roomlessClass] });

    expect(screen.getByText("Thesis")).toBeVisible();
    expect(screen.getByText(/No assigned room/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Open room" })).toBeNull();
  });
});
