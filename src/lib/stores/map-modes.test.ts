import { describe, expect, test } from "bun:test";
import {
  deactivateMapModesExcept,
  registerMapMode,
} from "@lib/stores/map-modes";

describe("map-modes", () => {
  test("deactivateMapModesExcept calls other mode handles", () => {
    const calls: string[] = [];
    registerMapMode("edit", { disable: () => calls.push("edit") });
    registerMapMode("routes", { disable: () => calls.push("routes") });
    registerMapMode("terrain", { disable: () => calls.push("terrain") });

    deactivateMapModesExcept("routes");
    expect(calls).toContain("edit");
    expect(calls).toContain("terrain");
    expect(calls).not.toContain("routes");
  });

  test("coexisting modes are left on", () => {
    const calls: string[] = [];
    registerMapMode("terrain", { disable: () => calls.push("terrain") });
    registerMapMode("travel-time", {
      disable: () => calls.push("travel-time"),
    });
    registerMapMode("measure", { disable: () => calls.push("measure") });

    deactivateMapModesExcept("measure", "travel-time");
    expect(calls).toContain("terrain");
    expect(calls).not.toContain("travel-time");
    expect(calls).not.toContain("measure");
  });
});
