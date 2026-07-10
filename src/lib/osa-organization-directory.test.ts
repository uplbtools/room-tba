import { describe, expect, test } from "bun:test";
import { parseOsaOrganizations } from "./osa-organization-directory.ts";

describe("parseOsaOrganizations", () => {
  test("keeps unique OSA organization profiles and ignores other links", () => {
    const organizations = parseOsaOrganizations(`
      <a class="orgText collection-item" href="orgs/example">UP &amp; Example</a>
      <a href="orgs/example" class="orgText">Duplicate</a>
      <a class="orgText" href="/downloads">Download</a>
    `);

    expect(organizations).toEqual([
      {
        name: "UP & Example",
        officialUrl: "https://uplbosa.org/orgs/example",
      },
    ]);
  });
});
