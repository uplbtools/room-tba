import { describe, expect, test } from "bun:test";
import { campusOfficeDirectoryEntries } from "./campus-office-directory.ts";

describe("campusOfficeDirectoryEntries", () => {
  test("keeps a canonical office entry and prefers its official site", () => {
    const entries = campusOfficeDirectoryEntries([
      {
        name: "OSA FB Page",
        url: "https://www.facebook.com/uplbosa.ovcsa/",
        description: "Office of Student Activities Facebook Page",
        category: "Units Under OVCSA",
      },
      {
        name: "OSA Website",
        url: "https://uplbosa.org/",
        description: "Office of Student Activities Website",
        category: "Units Under OVCSA",
      },
      {
        name: "AMIS",
        url: "https://amis.uplb.edu.ph",
        description: "Academic Management Information System",
        category: "Main Portals",
      },
    ]);

    expect(entries).toEqual([
      {
        name: "Office of Student Activities (OSA)",
        description: "Office of Student Activities Website",
        category: "office",
        url: "https://uplbosa.org/",
        linkType: "website",
      },
    ]);
  });
});
