import { describe, expect, test } from "bun:test";
import {
  ANONYMOUS_EDITOR,
  creditForRow,
  parseEntityAttributionRequest,
  publicActorName,
  ROOM_TBA_TEAM,
  scanPublicRows,
  toIsoTimestamp,
  toPublicHistoryEntry,
  type HistoryRow,
} from "./entity-attribution";

describe("parseEntityAttributionRequest", () => {
  test("accepts supported entity attribution requests", () => {
    expect(
      parseEntityAttributionRequest(
        new URLSearchParams({ entityType: "building", entityId: "12" }),
      ),
    ).toEqual({ ok: true, entityType: "building", entityId: 12 });
    expect(
      parseEntityAttributionRequest(
        new URLSearchParams({ entityType: "place", entityId: "3" }),
      ),
    ).toMatchObject({ ok: true });
    expect(
      parseEntityAttributionRequest(
        new URLSearchParams({ entityType: "organization", entityId: "3" }),
      ),
    ).toMatchObject({ ok: true });
  });

  test("rejects unsupported entity types and invalid ids", () => {
    for (const entityType of [
      "alias",
      "proposal",
      "constructor",
      "__proto__",
    ]) {
      expect(
        parseEntityAttributionRequest(
          new URLSearchParams({ entityType, entityId: "12" }),
        ),
      ).toMatchObject({ ok: false, status: 400 });
    }
    expect(
      parseEntityAttributionRequest(
        new URLSearchParams({ entityType: "room", entityId: "0" }),
      ),
    ).toMatchObject({ ok: false, status: 400 });
  });
});

describe("publicActorName", () => {
  test("maps scripts, imports, bulk rows, and the shared admin login to the team", () => {
    expect(publicActorName("maintenance-script", null)).toBe(ROOM_TBA_TEAM);
    expect(publicActorName("deep-research-seed-2026-07", null)).toBe(
      ROOM_TBA_TEAM,
    );
    expect(publicActorName("Admin", null)).toBe(ROOM_TBA_TEAM);
    expect(publicActorName("Stimmie", "[bulk:fix-rooms] cleanup")).toBe(
      ROOM_TBA_TEAM,
    );
  });

  test("never shows email-shaped names or opted-out editors", () => {
    expect(publicActorName("someone@up.edu.ph", null)).toBe(ANONYMOUS_EDITOR);
    expect(
      publicActorName("quiet", null, [
        {
          username: "quiet",
          displayName: "Quiet Editor",
          showInCredits: false,
        },
      ]),
    ).toBe(ANONYMOUS_EDITOR);
    expect(
      publicActorName("x@y.z", null, [
        { username: "x@y.z", displayName: null, showInCredits: true },
      ]),
    ).toBe(ANONYMOUS_EDITOR);
  });

  test("prefers the account display name over the login username", () => {
    expect(
      publicActorName("dnrmscl", null, [
        { username: "dnrmscl", displayName: "Dan", showInCredits: true },
      ]),
    ).toBe("Dan");
    expect(publicActorName("Juan", null)).toBe("Juan");
    expect(publicActorName("  ", null)).toBeNull();
  });
});

const row = (over: Partial<HistoryRow> = {}): HistoryRow => ({
  id: 1,
  entityType: "dorm",
  action: "update",
  editedBy: "reviewer@up.edu.ph",
  summary: null,
  before: {
    dormName: "Old",
    contactEmail: "a@b.c",
    contactPhone: "0917",
    imageUrl: "x",
  },
  after: {
    dormName: "New",
    contactEmail: "d@e.f",
    contactPhone: "0918",
    imageUrl: "y",
  },
  createdAt: "2026-09-08 08:57:22.000",
  ...over,
});

describe("toPublicHistoryEntry", () => {
  test("keeps only whitelisted card fields", () => {
    const entry = toPublicHistoryEntry(row(), [], []);
    expect(entry?.changes.map((c) => c.field)).toEqual(["dormName"]);
    expect(JSON.stringify(entry)).not.toMatch(/a@b\.c|d@e\.f|0917|0918/);
    expect(entry?.by).toBe(ANONYMOUS_EDITOR);
    expect(entry?.createdAt).toBe("2026-09-08T08:57:22.000Z");
  });

  test("drops rows where only private fields changed", () => {
    expect(
      toPublicHistoryEntry(
        row({
          before: { dormName: "Same", contactPhone: "1" },
          after: { dormName: "Same", contactPhone: "2" },
        }),
        [],
        [],
      ),
    ).toBeNull();
  });

  test("drops spacing-only edits, which read as no change at all", () => {
    expect(
      toPublicHistoryEntry(
        row({
          before: { dormName: "Molave Residence Hall " },
          after: { dormName: "Molave  Residence Hall" },
        }),
        [],
        [],
      ),
    ).toBeNull();
  });

  test("credits the proposal submitter over the approving admin", () => {
    const credits = [
      {
        entityType: "dorm",
        submitterName: "Maria",
        createdAt: "2026-09-08 08:57:22.220",
      },
    ];
    expect(toPublicHistoryEntry(row(), credits, [])?.by).toBe("Maria");
  });
});

describe("creditForRow", () => {
  test("matches create proposals by type and the closest later timestamp", () => {
    const created = row({ action: "create", createdAt: "2026-07-01 10:00:00" });
    expect(
      creditForRow(created, [
        {
          entityType: "create_dorm",
          submitterName: "Late",
          createdAt: "2026-07-01 10:00:05",
        },
        {
          entityType: "create_dorm",
          submitterName: "First",
          createdAt: "2026-07-01 10:00:00.2",
        },
        {
          entityType: "create_dorm",
          submitterName: "Before",
          createdAt: "2026-07-01 09:59:59",
        },
        {
          entityType: "create_room",
          submitterName: "Other",
          createdAt: "2026-07-01 10:00:00.1",
        },
      ]),
    ).toBe("First");
  });

  test("ignores credits outside the approval window", () => {
    expect(
      creditForRow(row(), [
        {
          entityType: "dorm",
          submitterName: "Old",
          createdAt: "2026-09-08 09:10:00",
        },
      ]),
    ).toBeNull();
  });
});

describe("scanPublicRows", () => {
  const hidden = (id: number) =>
    row({
      id,
      before: { dormName: "Same", contactPhone: "1" },
      after: { dormName: "Same", contactPhone: "2" },
    });
  const visible = (id: number) => row({ id });
  const pager = (all: HistoryRow[], size: number) => async (offset: number) =>
    all.slice(offset, offset + size);

  test("reads past a full batch of hidden edits to reach a visible one", async () => {
    const all = [...Array.from({ length: 5 }, (_, i) => hidden(i)), visible(9)];
    const { rows, nextOffset } = await scanPublicRows(pager(all, 2), {
      offset: 0,
      want: 1,
      batchSize: 2,
      scanLimit: 100,
    });
    expect(rows.map((r) => r.id)).toEqual([9]);
    expect(nextOffset).toBe(6);
  });

  test("returns null at the end of the history", async () => {
    const { rows, nextOffset } = await scanPublicRows(
      pager([visible(1), hidden(2), visible(3)], 2),
      { offset: 0, want: 10, batchSize: 2, scanLimit: 100 },
    );
    expect(rows.map((r) => r.id)).toEqual([1, 3]);
    expect(nextOffset).toBeNull();
  });

  test("stops at the scan limit and hands back a cursor", async () => {
    const all = Array.from({ length: 10 }, (_, i) => hidden(i));
    const { rows, nextOffset } = await scanPublicRows(pager(all, 2), {
      offset: 0,
      want: 1,
      batchSize: 2,
      scanLimit: 4,
    });
    expect(rows).toEqual([]);
    expect(nextOffset).toBe(4);
  });
});

describe("toIsoTimestamp", () => {
  test("parses timestamp and timestamptz text alike", () => {
    for (const value of [
      "2026-10-07 07:19:31.316662",
      "2026-10-07 07:19:31.316662+00",
      "2026-10-07T07:19:31.316662+00:00",
      "2026-10-07T07:19:31.316Z",
    ]) {
      expect(Number.isNaN(Date.parse(toIsoTimestamp(value)))).toBe(false);
    }
  });
});
