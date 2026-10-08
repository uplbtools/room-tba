import { describe, expect, test } from "bun:test";
import {
  KIND_POINTS,
  badgesFor,
  changedKeys,
  classifyContribution,
  daysLeft,
  endsInLabel,
  hallOfFame,
  newBadges,
  periodAt,
  pointsToPass,
  rankContributors,
  rewardMessage,
  type ContributionKind,
  type LedgerRow,
} from "./scoring";

let nextId = 1;
const OCT_5 = Date.UTC(2026, 9, 5, 4);

function row(overrides: Partial<LedgerRow> = {}): LedgerRow {
  return {
    id: nextId++,
    userId: null,
    contributorId: null,
    submitterName: null,
    accountName: null,
    accountVisible: true,
    kind: "text",
    entityType: "building",
    entityId: 1,
    entityLabel: "Physical Sciences",
    createdAtMs: OCT_5,
    ...overrides,
  };
}

function rows(
  count: number,
  base: Partial<LedgerRow>,
  kind: ContributionKind = "text",
): LedgerRow[] {
  return Array.from({ length: count }, (_, i) =>
    row({ ...base, kind, createdAtMs: (base.createdAtMs ?? OCT_5) + i * 1000 }),
  );
}

describe("classifyContribution", () => {
  test("new entries: places 5, rooms 3", () => {
    expect(classifyContribution({ entityType: "create_place" })).toBe("place");
    expect(classifyContribution({ entityType: "create_building" })).toBe(
      "place",
    );
    expect(classifyContribution({ entityType: "create_room" })).toBe("rooms");
    expect(
      classifyContribution({ entityType: "building", action: "create" }),
    ).toBe("place");
  });

  test("edits by the fields they touch", () => {
    expect(
      classifyContribution({ entityType: "room", keys: ["directions"] }),
    ).toBe("rooms");
    expect(
      classifyContribution({ entityType: "building", keys: ["imageUrl"] }),
    ).toBe("photo");
    expect(
      classifyContribution({ entityType: "building", keys: ["lat", "lon"] }),
    ).toBe("position");
    expect(
      classifyContribution({ entityType: "event_locations", keys: [] }),
    ).toBe("position");
    expect(
      classifyContribution({ entityType: "dorm", keys: ["description"] }),
    ).toBe("text");
  });

  test("weights", () => {
    expect(KIND_POINTS).toEqual({
      place: 5,
      rooms: 3,
      photo: 2,
      position: 2,
      text: 1,
    });
  });

  test("changedKeys diffs snapshots", () => {
    expect(
      changedKeys({ a: 1, b: "x", c: [1] }, { a: 1, b: "y", c: [1], d: 2 }),
    ).toEqual(["b", "d"]);
    expect(changedKeys(null, { a: 1 })).toEqual(["a"]);
  });
});

describe("rankContributors", () => {
  test("weights points by kind and keeps a per-kind breakdown", () => {
    const [ana] = rankContributors([
      row({ userId: 1, accountName: "Ana", kind: "place" }),
      row({ userId: 1, accountName: "Ana", kind: "photo" }),
      row({ userId: 1, accountName: "Ana", kind: "text" }),
    ]);
    expect(ana?.points).toBe(8);
    expect(ana?.contributions).toBe(3);
    expect(ana?.breakdown).toMatchObject({ place: 1, photo: 1, text: 1 });
  });

  test("competition ranking: ties share a place, the next place skips", () => {
    const standings = rankContributors([
      ...rows(5, { userId: 1, accountName: "Ana" }),
      ...rows(5, { userId: 2, accountName: "Ben" }),
      ...rows(4, { userId: 3, accountName: "Cara" }),
      ...rows(1, { userId: 4, accountName: "Dan" }),
    ]);
    expect(standings.map((s) => [s.displayName, s.place])).toEqual([
      ["Ana", 1],
      ["Ben", 1],
      ["Cara", 3],
      ["Dan", 4],
    ]);
    expect(standings.map((s) => s.medal)).toEqual([1, 1, 3, null]);
  });

  test("no medals below the minimum: 'Getting started' instead", () => {
    const standings = rankContributors([
      ...rows(2, { userId: 1, accountName: "Ana" }),
      ...rows(1, { userId: 2, accountName: "Ben" }),
    ]);
    expect(standings.every((s) => s.medal === null)).toBe(true);
    expect(standings.every((s) => s.gettingStarted)).toBe(true);
  });

  test("a tie across the whole board never hands everyone gold", () => {
    const standings = rankContributors([
      ...rows(3, { userId: 1, accountName: "Ana" }),
      ...rows(3, { userId: 2, accountName: "Ben" }),
    ]);
    expect(standings.map((s) => s.place)).toEqual([1, 1]);
    expect(standings.map((s) => s.medal)).toEqual([null, null]);
  });

  test("a four-way tie gets no medal, but the place stays shared", () => {
    const standings = rankContributors([
      ...rows(9, { userId: 9, accountName: "Top" }),
      ...[1, 2, 3, 4].flatMap((id) =>
        rows(4, { userId: id, accountName: `P${id}` }),
      ),
    ]);
    expect(standings[0]?.medal).toBe(1);
    expect(standings.slice(1).map((s) => s.place)).toEqual([2, 2, 2, 2]);
    expect(standings.slice(1).every((s) => s.medal === null)).toBe(true);
  });

  test("opted-out accounts take no place on the board", () => {
    const standings = rankContributors([
      ...rows(9, { userId: 1, accountName: "Hidden", accountVisible: false }),
      ...rows(3, { userId: 2, accountName: "Ben" }),
    ]);
    expect(standings.map((s) => s.displayName)).toEqual(["Ben"]);
    expect(standings[0]?.place).toBe(1);
  });

  test("includeKey ranks one hidden account privately", () => {
    const standings = rankContributors(
      [
        ...rows(9, { userId: 1, accountName: "Hidden", accountVisible: false }),
        ...rows(3, { userId: 2, accountName: "Ben" }),
      ],
      { includeKey: "u:1" },
    );
    expect(standings.map((s) => [s.key, s.visible])).toEqual([
      ["u:1", false],
      ["u:2", true],
    ]);
  });

  test("filters by period bounds", () => {
    const standings = rankContributors(
      [
        row({ userId: 1, accountName: "Ana", createdAtMs: OCT_5 }),
        row({ userId: 2, accountName: "Ben", createdAtMs: OCT_5 - 40 * 864e5 }),
      ],
      { fromMs: OCT_5 - 864e5, toMs: OCT_5 + 864e5 },
    );
    expect(standings.map((s) => s.displayName)).toEqual(["Ana"]);
  });
});

describe("credit identity", () => {
  const ID_A = "11111111-1111-4111-8111-111111111111";
  const ID_B = "22222222-2222-4222-8222-222222222222";

  test("one contributor id is one person whatever name they type", () => {
    const standings = rankContributors([
      row({ contributorId: ID_A, submitterName: "Ana", createdAtMs: OCT_5 }),
      row({
        contributorId: ID_A,
        submitterName: "Ana R.",
        createdAtMs: OCT_5 + 1000,
      }),
    ]);
    expect(standings).toHaveLength(1);
    // The display name is a label: the latest one typed.
    expect(standings[0]?.displayName).toBe("Ana R.");
  });

  test("the same typed name from two browsers is two people", () => {
    const standings = rankContributors([
      row({ contributorId: ID_A, submitterName: "Ana" }),
      row({ contributorId: ID_B, submitterName: "Ana" }),
    ]);
    expect(standings).toHaveLength(2);
  });

  test("legacy rows without an id group by normalized name", () => {
    const standings = rankContributors([
      row({ submitterName: "Ana Reyes" }),
      row({ submitterName: "  ana   reyes " }),
      row({ submitterName: "" }),
    ]);
    expect(standings).toHaveLength(1);
    expect(standings[0]?.contributions).toBe(2);
  });

  test("an id used while signed in follows the account", () => {
    const standings = rankContributors([
      row({ contributorId: ID_A, submitterName: "Ana" }),
      row({ userId: 7, accountName: "Ana Reyes", contributorId: ID_A }),
    ]);
    expect(standings).toHaveLength(1);
    expect(standings[0]).toMatchObject({
      key: "u:7",
      displayName: "Ana Reyes",
      contributions: 2,
    });
  });

  test("an opted-out account hides its linked device rows too", () => {
    const standings = rankContributors([
      row({ contributorId: ID_A, submitterName: "Ana" }),
      row({
        userId: 7,
        accountName: "Ana",
        accountVisible: false,
        contributorId: ID_A,
      }),
    ]);
    expect(standings).toHaveLength(0);
  });
});

describe("pointsToPass", () => {
  const standings = rankContributors([
    ...rows(10, { userId: 1, accountName: "Ana" }),
    ...rows(6, { userId: 2, accountName: "Ben" }),
    ...rows(3, { userId: 3, accountName: "Cara" }),
  ]);

  test("points to pass the next group up", () => {
    const cara = standings.find((s) => s.key === "u:3")!;
    expect(pointsToPass(standings, cara)).toEqual({ points: 4, place: 2 });
  });

  test("leader alone needs nothing", () => {
    const ana = standings.find((s) => s.key === "u:1")!;
    expect(pointsToPass(standings, ana)).toBeNull();
  });

  test("tied for first needs one to take the lead", () => {
    const tied = rankContributors([
      ...rows(4, { userId: 1, accountName: "Ana" }),
      ...rows(4, { userId: 2, accountName: "Ben" }),
    ]);
    expect(pointsToPass(tied, tied[1]!)).toEqual({ points: 1, place: 1 });
  });
});

describe("periods", () => {
  test("month flips at Manila midnight", () => {
    // Oct 31 17:00 UTC is Nov 1 01:00 in Manila.
    const period = periodAt("month", Date.UTC(2026, 9, 31, 17));
    expect(period.label).toBe("November 2026");
    expect(new Date(period.startMs).toISOString()).toBe(
      "2026-10-31T16:00:00.000Z",
    );
  });

  test("semesters follow the UPLB calendar cut", () => {
    expect(periodAt("semester", Date.UTC(2026, 9, 8)).label).toBe(
      "First semester 2026-2027",
    );
    expect(periodAt("semester", Date.UTC(2027, 2, 1)).label).toBe(
      "Second semester 2026-2027",
    );
    expect(periodAt("semester", Date.UTC(2027, 5, 15)).label).toBe(
      "Midyear 2027",
    );
  });

  test("days left and the label", () => {
    const now = Date.UTC(2026, 9, 8, 4);
    const period = periodAt("month", now);
    expect(daysLeft(period, now)).toBe(24);
    expect(endsInLabel(24)).toBe("Ends in 24 days");
    expect(endsInLabel(1)).toBe("Ends today");
  });

  test("hall of fame lists past winners, ties shared, newest first", () => {
    const now = Date.UTC(2026, 9, 8);
    const sep = Date.UTC(2026, 8, 10);
    const aug = Date.UTC(2026, 7, 10);
    const ledger = [
      ...rows(3, { userId: 1, accountName: "Ana", createdAtMs: sep }),
      row({ userId: 2, accountName: "Ben", createdAtMs: sep }),
      row({ userId: 2, accountName: "Ben", createdAtMs: aug }),
      row({ userId: 3, accountName: "Cara", createdAtMs: aug }),
      // Current month never makes the hall of fame.
      ...rows(9, { userId: 3, accountName: "Cara", createdAtMs: now }),
    ];
    const fame = hallOfFame(ledger, "month", now);
    expect(fame.map((entry) => entry.label)).toEqual([
      "September 2026",
      "August 2026",
    ]);
    expect(fame[0]?.winners.map((w) => w.displayName)).toEqual(["Ana"]);
    expect(fame[1]?.winners.map((w) => w.displayName).sort()).toEqual([
      "Ben",
      "Cara",
    ]);
  });
});

describe("badges and rewards", () => {
  test("badges at 1, 10 and 50 edits", () => {
    expect(badgesFor(0).filter((b) => b.earned)).toHaveLength(0);
    expect(badgesFor(10).map((b) => b.earned)).toEqual([true, true, false]);
    expect(badgesFor(50).every((b) => b.earned)).toBe(true);
  });

  test("newBadges reports only thresholds just crossed", () => {
    expect(newBadges(0, 1).map((b) => b.id)).toEqual(["first"]);
    expect(newBadges(8, 11).map((b) => b.id)).toEqual(["ten"]);
    expect(newBadges(11, 12)).toEqual([]);
  });

  test("reward toast copy", () => {
    expect(rewardMessage(5, 12)).toBe("+5, you're #12 this month");
    expect(rewardMessage(1, null)).toBe("+1 point for your approved edit");
  });
});
