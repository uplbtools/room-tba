import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkWikiLinks, extractHrefs, extractIds } from "./wiki-link-check";

let dist = "";

function page(path: string, body: string) {
  const dir = join(dist, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), body);
}

beforeAll(() => {
  dist = mkdtempSync(join(tmpdir(), "wiki-links-"));
  page(
    "wiki",
    `<h2 id="top">Top</h2>
     <a href="/wiki/a">ok</a>
     <a href="/wiki/a#part">ok anchor</a>
     <a href="/wiki/a#gone">bad anchor</a>
     <a href="/wiki/missing">bad page</a>
     <a href="#top">self ok</a>
     <a href="#nope">self bad</a>
     <a href="https://example.com/x">external</a>
     <a href="/api/thing">server</a>`,
  );
  page("wiki/a", `<h3 id="part">Part</h3><a href="/wiki">back</a>`);
});

afterAll(() => rmSync(dist, { recursive: true, force: true }));

describe("wiki link check", () => {
  test("extracts hrefs and ids", () => {
    expect(extractHrefs('<a class="x" href="/a">a</a><a href="#b">b</a>')).toEqual([
      "/a",
      "#b",
    ]);
    expect([...extractIds('<h2 id="x"></h2><p id="y">')]).toEqual(["x", "y"]);
  });

  test("reports missing pages and anchors, accepts the rest", () => {
    const broken = checkWikiLinks(dist, "wiki", [/^\/api\//]);
    expect(broken.map((b) => `${b.from} ${b.href}`).sort()).toEqual([
      "/wiki/ #nope",
      "/wiki/ /wiki/a#gone",
      "/wiki/ /wiki/missing",
    ]);
  });
});
