import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  decodeReviewCursor,
  encodeReviewCursor,
  hasActiveReviewFilters,
  parseReviewQueueQuery,
  REVIEW_ENTITY_TYPE_OPTIONS,
  REVIEW_PAGE_MAX,
  REVIEW_PAGE_SIZE,
  reviewQueueSearchParams,
} from "./review-queue-params";

const TYPES = ["room", "building", "create_room"] as const;

describe("review queue params", () => {
  test("cursor round-trips and rejects garbage", () => {
    const cursor = { createdAt: "2026-10-08 06:00:00.123", id: 42 };
    expect(decodeReviewCursor(encodeReviewCursor(cursor))).toEqual(cursor);
    expect(decodeReviewCursor("not-base64!!")).toBeNull();
    expect(decodeReviewCursor(btoa("nope|x"))).toBeNull();
    expect(decodeReviewCursor(null)).toBeNull();
  });

  test("parses filters, ignoring unknown types and bad numbers", () => {
    const q = parseReviewQueueQuery(
      new URLSearchParams(
        "entityType=room&submitter=%20Yeyel%20&olderThanDays=7&q=CEM&limit=500",
      ),
      TYPES,
    );
    expect(q).toMatchObject({
      entityType: "room",
      submitter: "Yeyel",
      olderThanDays: 7,
      q: "CEM",
      limit: REVIEW_PAGE_MAX,
      cursor: null,
    });
    const junk = parseReviewQueueQuery(
      new URLSearchParams("entityType=drop_table&olderThanDays=-1&limit=abc"),
      TYPES,
    );
    expect(junk.entityType).toBeNull();
    expect(junk.olderThanDays).toBeNull();
    expect(junk.limit).toBe(REVIEW_PAGE_SIZE);
  });

  test("search params mirror the filters", () => {
    const params = reviewQueueSearchParams(
      { entityType: "room", submitter: null, olderThanDays: 3, q: "x" },
      "abc",
    );
    expect(params.toString()).toBe(
      "entityType=room&olderThanDays=3&q=x&cursor=abc",
    );
    expect(
      hasActiveReviewFilters({
        entityType: null,
        submitter: null,
        olderThanDays: null,
        q: null,
      }),
    ).toBe(false);
  });

  test("filter menu covers every proposal entity type", () => {
    // proposal-service imports astro:env, so read its type lists as text.
    const source = readFileSync(
      join(import.meta.dir, "../services/proposal-service.ts"),
      "utf8",
    );
    const block = (name: string) =>
      source
        .split(`export const ${name} = [`)[1]
        ?.split("] as const;")[0]
        ?.match(/"([a-z_]+)"/g)
        ?.map((s) => s.slice(1, -1)) ?? [];
    const serverTypes = [
      ...block("PROPOSAL_UPDATE_TYPES"),
      ...block("PROPOSAL_CREATE_TYPES"),
    ].sort();
    expect(serverTypes.length).toBeGreaterThan(10);
    expect(REVIEW_ENTITY_TYPE_OPTIONS.map((o) => o.value).sort()).toEqual(
      serverTypes,
    );
  });
});
