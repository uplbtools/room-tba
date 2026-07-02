/**
 * Advisory: warn when the largest precached client JS exceeds PWA budget (3 MiB).
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BUDGET_BYTES = 3 * 1024 * 1024;
const CLIENT_DIR = "dist/client";

function largestJsFile(): { path: string; bytes: number } | null {
  try {
    let best: { path: string; bytes: number } | null = null;
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        const st = statSync(path);
        if (st.isDirectory()) walk(path);
        else if (name.endsWith(".js") && (!best || st.size > best.bytes)) {
          best = { path, bytes: st.size };
        }
      }
    };
    walk(CLIENT_DIR);
    return best;
  } catch {
    return null;
  }
}

const largest = largestJsFile();
if (!largest) {
  console.warn(
    "check:bundle skipped — run after build (dist/client not found or empty)",
  );
  process.exit(0);
}

if (largest.bytes > BUDGET_BYTES) {
  console.warn(
    `Bundle advisory: ${largest.path} is ${(largest.bytes / 1024 / 1024).toFixed(2)} MiB (budget ${BUDGET_BYTES / 1024 / 1024} MiB)`,
  );
  process.exit(1);
}

console.log(
  `OK: largest JS ${largest.path} ${(largest.bytes / 1024).toFixed(0)} KiB`,
);
process.exit(0);
