import { describe, expect, it } from "bun:test";
import { campusBrowseQuery } from "./browse-campus-shared";

describe("campusBrowseQuery", () => {
  it("builds side-panel browse state for the requested tab", () => {
    expect(campusBrowseQuery("colleges")).toEqual({
      category: "browse",
      type: "result",
      value: "colleges",
    });
  });
});
