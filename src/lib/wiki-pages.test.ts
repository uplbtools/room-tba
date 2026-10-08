import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { slugify } from "./wiki-html";
import {
  WIKI_INDEX_PATH,
  WIKI_PAGES,
  WIKI_PATHS,
  wikiCorrectionUrl,
} from "./wiki-pages";

const root = join(import.meta.dir, "..", "..");
const read = (relative: string) => readFileSync(join(root, relative), "utf8");
const wikiDir = join(root, "src/pages/wiki");
const wikiFiles = readdirSync(wikiDir).filter((f) => f.endsWith(".astro"));

/** Source files whose copy ships on wiki pages. */
const WIKI_SOURCES = [
  ...wikiFiles.map((f) => `src/pages/wiki/${f}`),
  "src/layouts/WikiLayout.astro",
  "src/components/wiki/WikiProvenance.astro",
  "src/components/SiteFooter.astro",
  "src/components/SponsorStrip.astro",
  "src/constants/emergency-hotlines.ts",
  "src/constants/campus-curfew.ts",
  "src/lib/wiki-pages.ts",
];

describe("wiki page registry", () => {
  test("lists exactly the article files, nothing missing or extra", () => {
    const fromFiles = wikiFiles
      .filter((f) => f !== "index.astro")
      .map((f) => `/wiki/${f.replace(/\.astro$/, "")}`)
      .sort();
    expect(WIKI_PAGES.map((p) => p.path).sort()).toEqual(fromFiles);
  });

  test("every entry points at its own source file and has a unique path", () => {
    for (const page of WIKI_PAGES) {
      expect(existsSync(join(root, page.sourcePath))).toBe(true);
      expect(page.sourcePath).toBe(`src/pages${page.path}.astro`);
    }
    expect(new Set(WIKI_PATHS).size).toBe(WIKI_PATHS.length);
    expect(WIKI_PATHS[0]).toBe(WIKI_INDEX_PATH);
  });

  test("every article page names the same h1 as the registry", () => {
    for (const page of WIKI_PAGES) {
      const source = read(page.sourcePath);
      const h1 = /<h1 class="wiki-title">([^<]+)<\/h1>/.exec(source)?.[1];
      expect(h1?.replace(/&amp;/g, "&")).toBe(page.title);
    }
  });
});

describe("sitemap", () => {
  test("is built from the wiki registry, so no wiki page can be left out", () => {
    const sitemap = read("src/pages/sitemap.xml.ts");
    expect(sitemap).toContain("...WIKI_PATHS");
    expect(sitemap).not.toMatch(/"\/wiki\//);
    for (const path of [
      "/wiki",
      "/wiki/emergency-hotlines",
      "/wiki/campus-curfew",
      "/wiki/glossary",
      "/wiki/jeepney-guide",
    ]) {
      expect(WIKI_PATHS).toContain(path);
    }
  });
});

describe("no interpuncts in wiki copy", () => {
  for (const file of WIKI_SOURCES) {
    test(file, () => {
      const source = read(file);
      expect(source).not.toContain("·");
      expect(source).not.toContain("&middot;");
      expect(source).not.toContain("&#183;");
    });
  }
});

describe("internal links in wiki sources", () => {
  /** A site path maps to a page file, or to a directory index. */
  function pageSource(pathname: string): string | null {
    const trimmed = pathname.replace(/^\/+|\/+$/g, "");
    const candidates = trimmed
      ? [
          `src/pages/${trimmed}.astro`,
          `src/pages/${trimmed}/index.astro`,
          `src/pages/${trimmed}.ts`,
        ]
      : ["src/pages/index.astro"];
    const hit = candidates.find((c) => existsSync(join(root, c)));
    return hit ? hit : null;
  }

  /** Ids present on a page: explicit id attributes plus slugified static headings. */
  function anchorsOf(source: string): Set<string> {
    const ids = new Set(
      [...source.matchAll(/\sid="([^"{}]+)"/g)].map((m) => m[1]!),
    );
    for (const m of source.matchAll(/<h[23]\s*>([^<{}]+)<\/h[23]>/g)) {
      ids.add(slugify(m[1]!));
    }
    return ids;
  }

  const redirects = [/^\/transparency/, /^\/discord/, /^\/messenger/];
  const dynamic = [
    /^\/(api|room|building|college|division|dorm|transit)(\/|$)/,
  ];

  for (const file of WIKI_SOURCES.filter((f) => f.endsWith(".astro"))) {
    test(file, () => {
      const source = read(file);
      const hrefs = [...source.matchAll(/href="(\/[^"{}]*)"/g)].map(
        (m) => m[1]!,
      );
      for (const href of hrefs) {
        const url = new URL(href, "https://example.test");
        if (dynamic.some((d) => d.test(url.pathname))) continue;
        if (redirects.some((d) => d.test(url.pathname))) continue;
        const target = pageSource(url.pathname);
        expect(target, `${file}: ${href} has no page`).not.toBeNull();
        const fragment = url.hash.slice(1);
        if (fragment) {
          expect(
            anchorsOf(read(target!)).has(fragment),
            `${file}: ${href} has no #${fragment}`,
          ).toBe(true);
        }
      }
    });
  }
});

describe("fork guide file references", () => {
  const tracked = execFileSync("git", ["ls-files"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\n")
    .filter(Boolean);
  const source = read("src/pages/wiki/fork-for-your-campus.astro");
  const codes = [...source.matchAll(/<code>([^<]+)<\/code>/g)].map(
    (m) => m[1]!,
  );
  const files = [
    ...new Set(
      codes.filter((c) =>
        /^[\w./[\]-]+\.(ts|tsx|json|mjs|astro|svelte|csv|md|sql)$/.test(c),
      ),
    ),
  ];

  test("finds file references to check", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const ref of files) {
    test(ref, () => {
      const exists = tracked.some((t) => t === ref || t.endsWith(`/${ref}`));
      expect(exists, `${ref} is not a file in this repository`).toBe(true);
    });
  }
});

describe("correction link", () => {
  test("opens a prefilled GitHub issue naming the page", () => {
    const url = new URL(
      wikiCorrectionUrl("Campus curfew", "/wiki/campus-curfew"),
    );
    expect(url.pathname.endsWith("/issues/new")).toBe(true);
    expect(url.searchParams.get("title")).toBe(
      "Wiki correction: Campus curfew",
    );
    expect(url.searchParams.get("body")).toContain("/wiki/campus-curfew");
  });
});
