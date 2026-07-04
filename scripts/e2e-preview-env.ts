/**
 * Print shell `export` lines for E2E preview (stdout only — safe for eval/source).
 */
import { loadEnv } from "./load-env";

loadEnv();

function exportLine(key: string, value: string | undefined): void {
  const trimmed = value?.trim();
  if (!trimmed) return;
  process.stdout.write(`export ${key}=${JSON.stringify(trimmed)}\n`);
}

exportLine(
  "DATABASE_URL",
  process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL,
);
exportLine(
  "ADMIN_PASSWORD",
  process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD,
);
exportLine(
  "ADMIN_SESSION_SECRET",
  process.env.E2E_ADMIN_SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET,
);
if (process.env.ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT === "1") {
  process.stdout.write(`export ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT=1\n`);
}
