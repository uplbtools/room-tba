import { describe, expect, test } from "bun:test";
import { parseChangelogHighlights } from "./changelog-highlights";

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
    expect(parseChangelogHighlights("# [1.0.0](https://example.com)\n")).toBeNull();
  });
});
