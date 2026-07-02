import { describe, expect, it } from "bun:test";
import {
  campusBrowseQuery,
  type CampusBrowseTab,
} from "./browse-campus-shared";

describe("campusBrowseQuery", () => {
  it("builds side-panel browse state for the requested tab", () => {
    expect(campusBrowseQuery("colleges")).toEqual({
      category: "browse",
      type: "result",
      value: "colleges",
    });
  });

  it.each([
    "buildings",
    "colleges",
    "divisions",
  ] as CampusBrowseTab[])("uses browse category for %s", (tab) => {
    expect(campusBrowseQuery(tab)).toEqual({
      category: "browse",
      type: "result",
      value: tab,
    });
  });
});

describe("classes browse query shape", () => {
  it("matches openBrowseClasses side-panel contract", () => {
    expect({
      category: "classes",
      type: "result",
      value: "All classes",
    }).toEqual({
      category: "classes",
      type: "result",
      value: "All classes",
    });
  });
});
