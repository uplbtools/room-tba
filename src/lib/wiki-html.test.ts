import { describe, expect, test } from "bun:test";
import {
  enhanceWikiHtml,
  insertToc,
  MIN_TOC_ENTRIES,
  readingMinutes,
  slugify,
  wikiTocHtml,
} from "./wiki-html";

describe("slugify", () => {
  test("lowercases and hyphenates", () => {
    expect(slugify("What the permit says, and what it does not")).toBe(
      "what-the-permit-says-and-what-it-does-not",
    );
    expect(slugify("  --NSTP / HK--  ")).toBe("nstp-hk");
  });
});

describe("enhanceWikiHtml", () => {
  const html = `<article><header><h1>T</h1></header>
<section><h2 id="first">First</h2><p>one two three</p></section>
<section><h2>Second &amp; third</h2><h3>Sub</h3></section>
<section><h2>Second &amp; third</h2></section>
<div class="table-wrap"><table></table></div></article>`;

  test("keeps existing ids and adds permalinks", () => {
    const out = enhanceWikiHtml(html).html;
    expect(out).toContain('<h2 id="first">First<a class="heading-anchor" href="#first"');
    expect(out).toContain('aria-label="Permalink to First"');
  });

  test("generates ids for bare headings and dedupes repeats", () => {
    const { html: out, toc } = enhanceWikiHtml(html);
    expect(out).toContain('id="second-third"');
    expect(out).toContain('id="second-third-2"');
    expect(toc.map((e) => e.id)).toEqual([
      "first",
      "second-third",
      "second-third-2",
    ]);
    expect(toc[1]?.text).toBe("Second & third");
  });

  test("only h2 headings reach the contents list", () => {
    const { toc } = enhanceWikiHtml(html);
    expect(toc.some((e) => e.text === "Sub")).toBe(false);
  });

  test("table wrappers become named, focusable regions", () => {
    const out = enhanceWikiHtml(html).html;
    expect(out).toContain(
      '<div class="table-wrap" role="region" tabindex="0" aria-label="Table: Second &amp; third">',
    );
  });

  test("counts visible words only", () => {
    const { words } = enhanceWikiHtml("<p>one <b>two</b></p><p>three</p>");
    expect(words).toBe(3);
  });
});

describe("contents list", () => {
  const entries = [
    { id: "a", text: "A & B" },
    { id: "b", text: "B" },
    { id: "c", text: "C" },
  ];

  test("is omitted below the minimum", () => {
    expect(wikiTocHtml(entries.slice(0, MIN_TOC_ENTRIES - 1))).toBe("");
  });

  test("links every section and escapes text", () => {
    const toc = wikiTocHtml(entries);
    expect(toc).toContain('<a href="#a">A &amp; B</a>');
    expect(toc.match(/<li>/g)?.length).toBe(3);
  });

  test("lands right after the article header", () => {
    const out = insertToc("<header>h</header><section/>", "<nav/>");
    expect(out).toBe("<header>h</header><nav/><section/>");
    expect(insertToc("<section/>", "<nav/>")).toBe("<section/>");
    expect(insertToc("<header>h</header>", "")).toBe("<header>h</header>");
  });
});

describe("readingMinutes", () => {
  test("rounds and never drops below one", () => {
    expect(readingMinutes(10)).toBe(1);
    expect(readingMinutes(2200)).toBe(10);
  });
});
