import { describe, expect, test } from "bun:test";
import {
  parseChangelogHighlights,
  isChangelogCurrent,
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
});
