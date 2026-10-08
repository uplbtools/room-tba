/**
 * Write the security headers into the Build Output API config the Astro
 * Vercel adapter generates (.vercel/output/config.json).
 *
 * vercel.json carries the same headers, but a deployment built from a
 * prebuilt .vercel/output may not merge vercel.json `headers`, and static
 * pages never pass through the Astro middleware. Prepending header-only
 * routes (`continue: true`) here makes every response, static or not, carry
 * them either way. Values come from src/lib/security-headers.ts, the single
 * source. No-op when there is no Vercel output (node adapter / E2E builds).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  NO_REFERRER_PATHS,
  NO_STORE_API_PREFIXES,
  NO_STORE_CACHE_CONTROL,
  SECURITY_HEADERS,
} from "../src/lib/security-headers";
import { buildSecurityRoutes } from "./lib/vercel-security-routes";

const configPath = join(
  import.meta.dir,
  "..",
  ".vercel",
  "output",
  "config.json",
);

/** The config text, or null when there is no Vercel output (ENOENT). */
function readConfig(): string | null {
  try {
    return readFileSync(configPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

const raw = readConfig();
if (raw === null) {
  console.log("vercel-security-headers: no .vercel/output, skipped");
} else {
  const config = JSON.parse(raw) as { routes?: unknown[] };
  const routes = buildSecurityRoutes({
    headers: SECURITY_HEADERS,
    noReferrerPaths: NO_REFERRER_PATHS,
    noStorePrefixes: NO_STORE_API_PREFIXES,
    noStoreValue: NO_STORE_CACHE_CONTROL,
  });
  config.routes = [...routes, ...(config.routes ?? [])];
  writeFileSync(configPath, `${JSON.stringify(config, null, "\t")}\n`);
  console.log(`vercel-security-headers: prepended ${routes.length} routes`);
}
