import { describe, expect, test } from "bun:test";
import {
  deactivateMapModesExcept,
  registerMapMode,
  type ExclusiveMapMode,
} from "@lib/stores/map-modes";

describe("map mode exclusivity", () => {
  test("deactivates every registered mode except the requested one", () => {
    const disabled: ExclusiveMapMode[] = [];
    for (const mode of [
      "edit",
      "routes",
      "terrain",
      "travel-time",
      "measure",
      "building-route",
    ] as const) {
      registerMapMode(mode, { disable: () => disabled.push(mode) });
    }

    deactivateMapModesExcept("building-route");
    expect(disabled).not.toContain("building-route");
    expect(disabled).toContain("measure");
    expect(disabled).toContain("travel-time");
    expect(disabled).toContain("routes");
  });
});
