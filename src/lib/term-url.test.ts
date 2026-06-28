import { describe, expect, it } from "bun:test";
import {
  parseTermIdFromSearch,
  TERM_QUERY_PARAM,
  withTermQuery,
} from "./term-url";

describe("term-url", () => {
  it("parses term query param", () => {
    expect(parseTermIdFromSearch("?term=1252")).toBe(1252);
    expect(parseTermIdFromSearch("?term=bad")).toBeNull();
    expect(parseTermIdFromSearch("")).toBeNull();
  });

  it("appends term query when not default", () => {
    expect(withTermQuery("/room/ics-260-12/", 1251, 1252)).toBe(
      "/room/ics-260-12/?term=1251",
    );
    expect(withTermQuery("/room/ics-260-12/", 1252, 1252)).toBe(
      "/room/ics-260-12/",
    );
  });

  it("exports stable query param name", () => {
    expect(TERM_QUERY_PARAM).toBe("term");
  });
});
