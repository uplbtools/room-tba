import { describe, expect, it } from "bun:test";
import { isFinalsWeek } from "./term-calendar";
import type { Term } from "./types";

function term(id: number): Term {
  return {
    id,
    label: `Term ${id}`,
    schoolYear: "2025-2026",
    semester: id === 1253 ? "midyear" : "2",
    startsOn: "2026-01-19",
    endsOn: "2026-05-31",
    isDefault: false,
    isActive: true,
    sortOrder: id,
    version: 1,
    updatedAt: "2026-01-01",
  };
}

describe("isFinalsWeek", () => {
  it("detects 2nd sem finals window in Manila", () => {
    expect(
      isFinalsWeek(new Date("2026-05-14T12:00:00+08:00"), term(1252)),
    ).toBe(true);
    expect(
      isFinalsWeek(new Date("2026-05-20T12:00:00+08:00"), term(1252)),
    ).toBe(false);
  });
});
