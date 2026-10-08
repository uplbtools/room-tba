// bun run check:wiki-links (after a build): fails when a wiki page links to a
// page or #anchor that the built site does not contain.
import { existsSync } from "node:fs";
import { checkWikiLinks } from "./lib/wiki-link-check";

const dist = process.argv[2] ?? "dist/client";
if (!existsSync(dist)) {
  console.error(`No build output at ${dist}. Run bun run build first.`);
  process.exit(1);
}

const broken = checkWikiLinks(dist, "wiki", [
  // Rendered per request, so there is no static file to find.
  /^\/(room|building|college|division|dorm|event|route|transit|unit|organization|establishment|landmark|api)(\/|$)/,
  // Redirects and app screens declared in astro.config.mjs or served by SSR.
  /^\/(discord|messenger|contribute|maintain|planner|calendar|today|final-exams|donate|sponsors|fork|transparency)(\/|$)/,
]);

if (broken.length > 0) {
  for (const link of broken) {
    console.error(`${link.from} -> ${link.href}: ${link.reason}`);
  }
  console.error(`\n${broken.length} broken wiki link(s).`);
  process.exit(1);
}
console.log("Wiki links OK.");
