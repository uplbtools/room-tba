import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  getStoredPendingCreateProposal,
  publishEntityPatch,
  readStoredProposals,
  rememberProposal,
  submitEntityProposal,
} from "./client";

const originalFetch = globalThis.fetch;
const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
  key: () => null,
  length: 0,
} as Storage;

if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = localStorageMock;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
  storage.clear();
});

describe("stored proposal refs", () => {
  test("getStoredPendingCreateProposal finds open create_building", () => {
    rememberProposal({
      id: 42,
      entityType: "create_building",
      entityId: 0,
      status: "pending",
    });
    rememberProposal({
      id: 7,
      entityType: "create_room",
      entityId: 0,
      status: "rejected",
    });

    expect(getStoredPendingCreateProposal("create_building")).toEqual({
      id: 42,
      entityType: "create_building",
      entityId: 0,
      status: "pending",
    });
    expect(getStoredPendingCreateProposal("create_room")).toBeNull();
    expect(readStoredProposals()).toHaveLength(2);
  });
});

describe("submitEntityProposal", () => {
  test("reuses stored open proposal when revising", async () => {
    rememberProposal({
      id: 42,
      entityType: "room",
      entityId: 7,
      status: "pending",
    });
    globalThis.fetch = mock(async (_url, init) => {
      expect(JSON.parse(String(init?.body))).toMatchObject({
        proposalId: 42,
        entityType: "room",
        entityId: 7,
      });
      return Response.json({
        proposal: {
          id: 42,
          entityType: "room",
          entityId: 7,
          status: "pending",
        },
      });
    }) as typeof fetch;

    const result = await submitEntityProposal({
      entityType: "room",
      entityId: 7,
      baseVersion: 2,
      patch: { directions: "Updated" },
      submitterName: "Ana",
    });

    expect(result.ok).toBe(true);
    expect(result.proposal?.id).toBe(42);
  });
});

describe("publishEntityPatch", () => {
  test("returns conflict payload on 409", async () => {
    globalThis.fetch = mock(async () =>
      Response.json(
        {
          error: "This building was changed by another editor.",
          latest: { id: 1, version: 5, lat: 1, lon: 2 },
        },
        { status: 409 },
      ),
    ) as typeof fetch;

    const result = await publishEntityPatch("building", 1, 3, {
      lat: 1.1,
      lon: 2.2,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("changed by another editor");
    expect(result.latest).toEqual({
      id: 1,
      version: 5,
      lat: 1,
      lon: 2,
    });
  });

  test("returns published entity on success", async () => {
    globalThis.fetch = mock(async () =>
      Response.json({
        success: true,
        building: { id: 1, version: 4, lat: 1.1, lon: 2.2 },
      }),
    ) as typeof fetch;

    const result = await publishEntityPatch("building", 1, 3, {
      lat: 1.1,
      lon: 2.2,
    });

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      id: 1,
      version: 4,
      lat: 1.1,
      lon: 2.2,
    });
  });
});
