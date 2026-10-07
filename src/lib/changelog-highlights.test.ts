import { describe, expect, test } from "bun:test";
import {
  parseChangelogEntries,
  parseChangelogHighlights,
  isChangelogCurrent,
  userFacingEntries,
  userFacingItem,
} from "./changelog-highlights";

describe("isChangelogCurrent", () => {
  test("true when the changelog matches or leads the app version", () => {
    expect(isChangelogCurrent("1.31.1", "1.31.1")).toBe(true);
    expect(isChangelogCurrent("1.31.0", "1.31.0")).toBe(true);
    expect(isChangelogCurrent("1.32.0", "1.31.1")).toBe(true);
  });

  test("false when the changelog lags the installed version (the 1.23 vs 1.31 bug)", () => {
    expect(isChangelogCurrent("1.23.0", "1.31.1")).toBe(false);
    expect(isChangelogCurrent("1.9.0", "1.10.0")).toBe(false);
  });

  test("tolerates a leading v and missing patch segments", () => {
    expect(isChangelogCurrent("v1.31", "1.31.0")).toBe(true);
    expect(isChangelogCurrent("v1.23", "v1.31.1")).toBe(false);
  });
});

describe("parseChangelogHighlights", () => {
  test("returns top bullets for the latest version", () => {
    const md = `# [1.9.0](https://example.com)

### Features

* **feat:** campus events on the map
* **fix:** mobile search chrome

# [1.8.0](https://example.com)

* older entry
`;

    const result = parseChangelogHighlights(md, { maxItems: 2 });
    expect(result?.version).toBe("1.9.0");
    expect(result?.items).toEqual([
      "feat: campus events on the map",
      "fix: mobile search chrome",
    ]);
    expect(result?.totalCount).toBe(2);
  });

  test("returns null when no bullets exist", () => {
    expect(
      parseChangelogHighlights("# [1.0.0](https://example.com)\n"),
    ).toBeNull();
  });

  test("accepts dash bullets (prettier rewrites * to -)", () => {
    const md = `# [1.36.0](https://example.com) (2026-07-09)

### Features

- **account:** include saved planner plans in the data export ([#2](https://example.com/2))
`;
    const result = parseChangelogHighlights(md);
    expect(result?.items).toEqual([
      "account: include saved planner plans in the data export",
    ]);
  });
});

describe("parseChangelogEntries", () => {
  test("parses every release with sections and dates", () => {
    const md = `# [1.36.0](https://example.com) (2026-07-09)

### Features

- **account:** include saved planner plans ([abc](https://example.com))

# [1.35.2](https://example.com) (2026-07-09)

### Bug Fixes

- **planner:** tile same-timeslot drag ghosts

# [1.35.1](https://example.com)

- sectionless bullet
`;
    const entries = parseChangelogEntries(md);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({
      version: "1.36.0",
      date: "2026-07-09",
      sections: [
        { title: "Features", items: ["account: include saved planner plans"] },
      ],
    });
    expect(entries[1]?.sections[0]?.title).toBe("Bug Fixes");
    expect(entries[2]).toEqual({
      version: "1.35.1",
      date: null,
      sections: [{ title: "", items: ["sectionless bullet"] }],
    });
  });

  test("drops releases with no bullets and accepts h2 version headings", () => {
    const md = `# [2.0.0](https://example.com) (2026-01-01)

## [1.9.9](https://example.com) (2025-12-31)

### Bug Fixes

- real fix
`;
    const entries = parseChangelogEntries(md);
    expect(entries.map((e) => e.version)).toEqual(["1.9.9"]);
  });
});

describe("userFacingItem", () => {
  test("drops the scope prefix and capitalizes", () => {
    expect(
      userFacingItem(
        "transit: Forestry boards at its terminals; scale bar off the route",
      ),
    ).toBe("Forestry boards at its terminals; scale bar off the route");
  });

  test("hides entries whose scopes are all internal", () => {
    expect(userFacingItem("ci: pin bun to 1.3.12")).toBeNull();
    expect(userFacingItem("e2e: keep the drizzle dir lookup lazy")).toBeNull();
    expect(
      userFacingItem("test: restore the 20s integration timeout"),
    ).toBeNull();
  });

  test("trims jargon clauses, or the whole entry when it leads", () => {
    expect(
      userFacingItem(
        "SNODLOB e-jeep loop, designed printable map, mobile pixel pass",
      ),
    ).toBe("SNODLOB e-jeep loop, designed printable map");
    expect(
      userFacingItem(
        "browse+e2e: browsing away closes the jeepney stop panel, spec label drift",
      ),
    ).toBe("Browsing away closes the jeepney stop panel");
    expect(
      userFacingItem(
        "e2e+chrome: revive the suite after the Aug chrome redesign , closes",
      ),
    ).toBeNull();
    expect(
      userFacingItem(
        "editor: foundation refactor and map chrome componentization",
      ),
    ).toBeNull();
  });

  test("drops the bare closes tail left by stripped issue links", () => {
    expect(userFacingItem("today: add a Today screen , closes")).toBe(
      "Add a Today screen",
    );
    expect(userFacingItem("a11y: 44px controls, and drawer closes")).toBe(
      "44px controls, and drawer closes",
    );
  });
});

describe("userFacingEntries", () => {
  test("renames sections and drops releases with nothing user-facing", () => {
    const entries = userFacingEntries([
      {
        version: "2.0.1",
        date: null,
        sections: [{ title: "Bug Fixes", items: ["ci: fix release"] }],
      },
      {
        version: "2.0.0",
        date: null,
        sections: [
          { title: "Features", items: ["map: a new layer"] },
          { title: "Bug Fixes", items: ["test: flaky timeout"] },
        ],
      },
    ]);
    expect(entries).toEqual([
      {
        version: "2.0.0",
        date: null,
        sections: [{ title: "New", items: ["A new layer"] }],
      },
    ]);
  });
});
