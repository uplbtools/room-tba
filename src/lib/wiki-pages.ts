// One list of wiki pages. The index, the "see also" list, the sitemap, and the
// internal-link test all read it, so a new article is added in one place.

import { GITHUB_ROOM_TBA_URL } from "@constants/community-links";

export type WikiPage = {
  path: string;
  /** The article's own h1. */
  title: string;
  /** Short category shown on the index. */
  kicker: string;
  blurb: string;
  /** Repo-relative source file, for provenance and the edit link. */
  sourcePath: string;
};

export const WIKI_INDEX_PATH = "/wiki";

export const WIKI_PAGES: readonly WikiPage[] = [
  {
    path: "/wiki/using-room-tba",
    title: "Finding a room, a class, or a way across campus",
    kicker: "How-to",
    blurb:
      "Look up a room or class, plan a week and save the map for offline use, step by step. It also points to the official sources for enrollment, grades and the academic calendar.",
    sourcePath: "src/pages/wiki/using-room-tba.astro",
  },
  {
    path: "/wiki/glossary",
    title: "UPLB glossary: TBA, LH, AB, CAS and more",
    kicker: "Glossary",
    blurb:
      "These are the abbreviations on schedules, room signs and building names, from AMIS and CRS to the college acronyms and room-code prefixes.",
    sourcePath: "src/pages/wiki/glossary.astro",
  },
  {
    path: "/wiki/jeepney-guide",
    title: "Jeepneys and buses around UPLB",
    kicker: "Getting around",
    blurb:
      "This covers the campus routes, their stops, fares and boarding tips, read from the same data the map uses.",
    sourcePath: "src/pages/wiki/jeepney-guide.astro",
  },
  {
    path: "/wiki/emergency-hotlines",
    title: "Emergency hotlines around UPLB",
    kicker: "Emergency contacts",
    blurb:
      "These contacts for campus security, local responders and nearby medical services work offline.",
    sourcePath: "src/pages/wiki/emergency-hotlines.astro",
  },
  {
    path: "/wiki/campus-curfew",
    title: "Campus curfew and dorm permits",
    kicker: "Dorm guide",
    blurb:
      "This gives curfew hours and return-permit guidance for residents of UP-managed dormitories.",
    sourcePath: "src/pages/wiki/campus-curfew.astro",
  },
  {
    path: "/wiki/section-times",
    title: "What times do UPLB section names correspond to?",
    kicker: "Class schedules",
    blurb:
      "This glossary covers letter ladders, NSTP/HK/GI/residency, MS/PhD numbers and every AMIS type. It also shows term trends from oldest to newest (what moved and what only looks bigger in Room TBA).",
    sourcePath: "src/pages/wiki/section-times.astro",
  },
  {
    path: "/wiki/upcat-at-uplb",
    title: "Taking the UPCAT at UP Los Baños",
    kicker: "UPCAT at UPLB",
    blurb:
      "This first-timer's guide to the UPCAT at UPLB covers what the test permit does and doesn't tell you, what to bring and how to save the campus map before mobile data gets congested. It was written for the August 2026 exam.",
    sourcePath: "src/pages/wiki/upcat-at-uplb.astro",
  },
  {
    path: "/wiki/fork-for-your-campus",
    title: "Fork this for your campus",
    kicker: "For other campuses",
    blurb:
      "Room TBA is built for UPLB. This is what you replace to run it for a different campus, from the UPLB data and glue to rip out and the config to repoint to the parts you write yourself (class import).",
    sourcePath: "src/pages/wiki/fork-for-your-campus.astro",
  },
] as const;

/** Every wiki URL, index first. */
export const WIKI_PATHS: readonly string[] = [
  WIKI_INDEX_PATH,
  ...WIKI_PAGES.map((page) => page.path),
];

export const WIKI_REPO_URL = GITHUB_ROOM_TBA_URL;

/**
 * GitHub issue form prefilled for a wiki correction. Students do not need a
 * GitHub-edit workflow to say "this number is wrong".
 */
export function wikiCorrectionUrl(pageTitle: string, path: string): string {
  const params = new URLSearchParams({
    title: `Wiki correction: ${pageTitle}`,
    body: `Page: https://room-tba.uplb.tools${path}\n\nWhat is wrong:\n\nWhat it should say (with a source if you have one):\n`,
  });
  return `${WIKI_REPO_URL}/issues/new?${params.toString()}`;
}
