import { describe, expect, it } from "bun:test";
import {
  getBuildingCanonicalPath,
  getDormCanonicalPath,
  getEntityCanonicalPath,
  getEventCanonicalPath,
  getRoomCanonicalPath,
  normalizePathname,
  parseEntityPathname,
  parseRouteSlug,
  resolveQueryFromEntityPath,
} from "./entity-urls";

describe("entity-urls", () => {
  it("normalizes pathnames with trailing slashes", () => {
    expect(normalizePathname("/room/foo/")).toBe("/room/foo/");
    expect(normalizePathname("/room/foo")).toBe("/room/foo/");
    expect(normalizePathname("/")).toBe("/");
  });

  it("parses entity pathnames", () => {
    expect(parseEntityPathname("/building/baker-hall/")).toEqual({
      category: "building",
      slug: "baker-hall",
    });
    expect(parseEntityPathname("/event/my-event/")).toEqual({
      category: "event",
      slug: "my-event",
    });
    expect(parseEntityPathname("/changelog")).toBeNull();
  });

  it("parses route slugs with numeric ids", () => {
    expect(parseRouteSlug("baker-hall-42")).toEqual({
      nameSlug: "baker-hall",
      id: 42,
    });
    expect(parseRouteSlug("baker-hall")).toEqual({
      nameSlug: "baker-hall",
      id: null,
    });
  });

  it("builds canonical entity paths", () => {
    expect(getBuildingCanonicalPath("Baker Hall")).toBe(
      "/building/baker-hall/",
    );
    expect(getRoomCanonicalPath({ id: 12, code: "ICS 260" })).toBe(
      "/room/ics-260-12/",
    );
    expect(getDormCanonicalPath({ id: 3, dormName: "SJD" })).toBe(
      "/dorm/sjd-3/",
    );
    expect(getEventCanonicalPath("uplb-fair")).toBe("/event/uplb-fair/");
  });

  it("resolves query state from entity paths when app data is available", () => {
    const resolved = resolveQueryFromEntityPath(
      { category: "building", slug: "baker-hall" },
      {
        buildings: [
          {
            id: 1,
            buildingName: "Baker Hall",
            lat: null,
            lon: null,
            directions: null,
            buildingType: "non-admin",
            version: 1,
            updatedAt: "",
          },
        ],
      },
    );

    expect(resolved).toEqual({
      type: "result",
      category: "building",
      value: "Baker Hall",
    });
  });

  it("returns null for room paths without async room lookup", () => {
    expect(
      resolveQueryFromEntityPath({ category: "room", slug: "ics-260-12" }, {}),
    ).toBeNull();
  });

  it("builds paths from query state when entity context is present", () => {
    expect(
      getEntityCanonicalPath({
        type: "result",
        category: "building",
        value: "Baker Hall",
      }),
    ).toBe("/building/baker-hall/");

    expect(
      getEntityCanonicalPath(
        { type: "result", category: "room", value: "ICS 260" },
        { room: { id: 12, code: "ICS 260" } },
      ),
    ).toBe("/room/ics-260-12/");

    expect(
      getEntityCanonicalPath({ type: "query", category: null, value: "" }),
    ).toBeNull();
  });
});
