import { describe, expect, test } from "vitest";
import {
  getBuildings,
  getColleges,
  getDivisions,
  getDorms,
  getEvents,
  getClasses,
} from "./utils";

describe("utils", () => {
  test("return offline entity fallbacks", () => {
    expect(Object.keys(getBuildings)).not.toHaveLength(0);
    expect(Object.keys(getColleges)).not.toHaveLength(0);
    expect(Object.keys(getDivisions)).not.toHaveLength(0);
    expect(Object.keys(getDorms)).not.toHaveLength(0);
    expect(Object.keys(getEvents)).not.toHaveLength(0);
    expect(Object.keys(getClasses)).not.toHaveLength(0);
  });
});
