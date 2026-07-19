/**
 * Scan tracked files for UPLB-specific strings a fork must replace.
 *
 * On upstream (uplbtools/room-tba) this reports many hits — that is expected,
 * this is the UPLB app. Run it on YOUR fork after you think you have replaced
 * everything. A clean run means you caught it all; remaining hits are things
 * you forgot.
 *
 * Usage:
 *   bun run fork:check            # report hits, exit 1 if any
 *   bun run fork:check --silent   # exit code only (for your fork's CI)
 *
 * Wire it into your fork's CI after the upstream files are replaced.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

type Marker = { pattern: RegExp; hint: string };

const markers: Marker[] = [
  { pattern: /\buplb\b/gi, hint: "UPLB name — rebrand to your campus." },
  { pattern: /uplbtools/gi, hint: "UPLB Tools org/domain — your org/domain." },
  {
    pattern: /room-tba\.uplbtools\.me/gi,
    hint: "Production URL — set to your domain (also astro.config.mjs `site:`).",
  },
  {
    pattern: /(discord|messenger)\.uplbtools\.me/gi,
    hint: "UPLB community subdomains — your community links, or delete.",
  },
  {
    pattern: /m\.me\/j\/[A-Za-z0-9_-]+/gi,
    hint: "UPLB Messenger group invite — your community link, or delete.",
  },
  { pattern: /\bMakiling\b/g, hint: "Mt. Makiling terrain — your terrain source, or disable 3D." },
  {
    pattern: /\bAMIS\b/g,
    hint: "UPLB course system. You do not have AMIS — write your own class importer.",
  },
  { pattern: /\bSAIS\b/g, hint: "UPLB student system reference — repoint to your registrar." },
  { pattern: /\bPSLH\b/g, hint: "UPLB building code (Physical Sciences Lecture Hall)." },
  { pattern: /\bPhySci\b/g, hint: "UPLB building alias (Physical Sciences)." },
  { pattern: /\bOble\b|\bOblation\b/g, hint: "UPLB landmark — your campus landmark, or remove copy." },
  { pattern: /Los Ba[ñn]os/g, hint: "UPLB campus locale — your campus location." },
  { pattern: /r\/peyups/gi, hint: "UPLB subreddit source credit — remove or replace." },
  {
    pattern: /121\.24125948460573|14\.16323736946326/g,
    hint: "UPLB default map center — set to your campus center in map-terrain.ts.",
  },
];

// Files that mention UPLB by design (this scanner, the fork guide that tells
// you to replace UPLB strings). Everything else is a real "you forgot this".
const allowList = [/scripts\/fork-check\.ts$/, /src\/pages\/wiki\/fork-for-your-campus\.astro$/];

type Hit = { file: string; line: number; text: string; hint: string };

function isBinary(buf: Buffer): boolean {
  return buf.includes(0, 0, Math.min(buf.length, 8000));
}

function scan(): Hit[] {
  const files = execSync("git ls-files", { encoding: "utf8" }).trim().split("\n");
  const hits: Hit[] = [];
  for (const file of files) {
    if (allowList.some((re) => re.test(file))) continue;
    let buf: Buffer;
    try {
      buf = readFileSync(file);
    } catch {
      continue;
    }
    if (isBinary(buf)) continue;
    const text = buf.toString("utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, hint } of markers) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          hits.push({ file, line: i + 1, text: line.trim().slice(0, 160), hint });
        }
      }
    }
  }
  return hits;
}

const silent = process.argv.includes("--silent");
const hits = scan();

if (hits.length === 0) {
  if (!silent) console.log("fork:check passed — no UPLB-specific strings found.");
  process.exit(0);
}

if (!silent) {
  const byFile = new Map<string, Hit[]>();
  for (const h of hits) {
    const arr = byFile.get(h.file) ?? [];
    arr.push(h);
    byFile.set(h.file, arr);
  }
  console.error(`fork:check found ${hits.length} UPLB-specific hit(s) across ${byFile.size} file(s).\n`);
  for (const [file, fileHits] of byFile) {
    console.error(`  ${file}  (${fileHits.length})`);
    for (const h of fileHits.slice(0, 5)) {
      console.error(`    :${h.line}  ${h.hint}`);
    }
    if (fileHits.length > 5) {
      console.error(`    … and ${fileHits.length - 5} more in this file.`);
    }
  }
  console.error(
    "\nReplace or delete these before deploying your fork. See /wiki/fork-for-your-campus.",
  );
}
process.exit(1);
