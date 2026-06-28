import { describe, expect, it } from "bun:test";
import { normalizeStringList } from "./string-lists";

describe("normalizeStringList", () => {
  it("strips single quotes from array elements", () => {
    expect(
      normalizeStringList(["'Shared rooms'", "'Laundry facilities'"]),
    ).toEqual(["Shared rooms", "Laundry facilities"]);
  });

  it("parses JSON string arrays", () => {
    expect(
      normalizeStringList('["Shared rooms","Laundry facilities"]'),
    ).toEqual(["Shared rooms", "Laundry facilities"]);
  });

  it("drops postgres array parse artifacts", () => {
    expect(
      normalizeStringList([
        "Shared rooms",
        "Laundry facilities",
        "Locker",
        "]",
      ]),
    ).toEqual(["Shared rooms", "Laundry facilities", "Locker"]);
  });

  it("parses postgres array literals with single-quoted elements", () => {
    expect(
      normalizeStringList("{'Shared rooms','Laundry facilities','Locker'}"),
    ).toEqual(["Shared rooms", "Laundry facilities", "Locker"]);
  });

  it("parses postgres array literals with nested quote wrappers", () => {
    expect(
      normalizeStringList(`{"'Shared rooms'","'Laundry facilities'"}`),
    ).toEqual(["Shared rooms", "Laundry facilities"]);
  });

  it("parses single-quoted pseudo-json arrays", () => {
    expect(
      normalizeStringList("['Shared rooms','Laundry facilities','Locker']"),
    ).toEqual(["Shared rooms", "Laundry facilities", "Locker"]);
  });

  it("flattens nested array literals stored as one element", () => {
    expect(
      normalizeStringList(["{'Shared rooms','Laundry facilities'}"]),
    ).toEqual(["Shared rooms", "Laundry facilities"]);
  });
});
