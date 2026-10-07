import { describe, expect, test } from "bun:test";
import {
  formatHistoryTime,
  presentHistoryChanges,
  wordDiff,
} from "./history-presentation";

const diff = (field: string, before: string | null, after: string | null) => ({
  field,
  label: field,
  before,
  after,
});

describe("presentHistoryChanges", () => {
  test("folds a lat/lon pair into one distance", () => {
    const views = presentHistoryChanges(
      [
        diff("lat", "14.163842488991804", "14.164131382521745"),
        diff("lon", "121.24340439286937", "121.24138507773836"),
      ],
      "update",
    );
    expect(views).toEqual([
      {
        kind: "note",
        field: "location",
        label: "Map pin",
        text: "Moved about 220 m",
      },
    ]);
  });

  test("measures a one-axis move along that axis", () => {
    const [view] = presentHistoryChanges(
      [diff("lat", "14.1600", "14.1610")],
      "update",
    );
    expect(view).toMatchObject({ text: "Moved about 111 m" });
  });

  test("says when a pin is first placed", () => {
    const [view] = presentHistoryChanges(
      [diff("lat", null, "14.16"), diff("lon", null, "121.24")],
      "update",
    );
    expect(view).toMatchObject({ text: "Placed on the map" });
  });

  test("shows stored codes as their labels", () => {
    const [cr, category, recurrence] = presentHistoryChanges(
      [
        diff("crFacilities", null, "hand-dryer, bidet"),
        diff("category", "student-org", "student-council"),
        diff("recurrence", "none", "every_1st_sem"),
      ],
      "update",
    );
    expect(cr).toMatchObject({ after: "Hand dryer, Bidet" });
    expect(category).toMatchObject({
      before: "Student Org",
      after: "Student Council",
    });
    expect(recurrence).toMatchObject({
      before: "None",
      after: "Every 1st sem",
    });
  });

  test("leaves free text alone", () => {
    const [view] = presentHistoryChanges(
      [diff("directions", "near-ish the gate", "by the gate")],
      "update",
    );
    expect(view).toMatchObject({ kind: "value", before: "near-ish the gate" });
  });

  test("marks only the changed words in a long passage", () => {
    const before =
      "Also called the Landscape Horticulture Knowledge Center Building, in front of the UPF office.";
    const after =
      "Also called the Landscape Horticulture Knowledge Center Building, in front of the UPF headquarters.";
    const [view] = presentHistoryChanges(
      [diff("directions", before, after)],
      "update",
    );
    expect(view?.kind).toBe("words");
    const parts = view?.kind === "words" ? view.parts : [];
    expect(parts.filter((p) => p.op !== "same")).toEqual([
      { text: "office.", op: "del" },
      { text: "headquarters.", op: "ins" },
    ]);
  });
});

describe("wordDiff", () => {
  test("reads a rephrased phrase as one removal then one addition", () => {
    const parts = wordDiff(
      "found in front of the UPF",
      "found right behind the UPF",
    );
    expect(parts?.filter((p) => p.op !== "same")).toEqual([
      { text: "in front of", op: "del" },
      { text: "right behind", op: "ins" },
    ]);
  });

  test("rebuilds both sides from its parts", () => {
    const parts = wordDiff("a b c d", "a x c d e") ?? [];
    const side = (op: "del" | "ins") =>
      parts
        .filter((p) => p.op !== op)
        .map((p) => p.text)
        .join("");
    expect(side("ins")).toBe("a b c d");
    expect(side("del")).toBe("a x c d e");
  });
});

describe("formatHistoryTime", () => {
  test("uses campus time whatever the device zone", () => {
    expect(formatHistoryTime("2026-09-08T16:53:07Z")).toBe(
      "Sep 9, 2026, 12:53 AM PHT",
    );
    expect(formatHistoryTime("2026-09-08T16:53:07Z", false)).toBe(
      "Sep 9, 2026",
    );
    expect(formatHistoryTime("not a date")).toBeNull();
  });
});
