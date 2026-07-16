/**
 * Apply pending drizzle/*.sql migrations to Postgres with ledger tracking.
 *
 * Production: run from Release workflow on push to main (PROD_DATABASE_URL).
 * Idempotent SQL files may be re-run safely; data migrations are recorded once.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { loadEnv } from "./load-env";

loadEnv();

const PROD_PROJECT_REF = "ccdqtmscmnixjbynwdvb";
const E2E_PROJECT_REF = "yhzinxlakcewqjaqbbaj";

/** Initial introspection dump — commented out; never execute on live DBs. */
const SKIP_FILES = new Set(["0000_smooth_spitfire.sql"]);

const MIGRATIONS_TABLE = "schema_migrations";

export function listMigrationFiles(
  drizzleDir = join(import.meta.dir, "..", "drizzle"),
): string[] {
  return readdirSync(drizzleDir)
    .filter((name) => name.endsWith(".sql") && !SKIP_FILES.has(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function resolveDatabaseUrl(): string {
  const prodOnly = process.argv.includes("--prod");
  const url = (
    prodOnly
      ? process.env.PROD_DATABASE_URL
      : process.env.DATABASE_URL?.trim() ||
        process.env.PROD_DATABASE_URL?.trim()
  )?.trim();

  if (!url) {
    throw new Error(
      prodOnly
        ? "PROD_DATABASE_URL is required (use GitHub Actions secret on release)"
        : "DATABASE_URL or PROD_DATABASE_URL is required",
    );
  }

  if (prodOnly && !url.includes(PROD_PROJECT_REF)) {
    throw new Error(
      `Refusing prod apply: connection must include Supabase project ref ${PROD_PROJECT_REF}`,
    );
  }

  if (url.includes(E2E_PROJECT_REF)) {
    throw new Error(
      `Refusing to apply migrations on E2E database (${E2E_PROJECT_REF}). Use e2e-reset-db instead.`,
    );
  }

  return url;
}

async function ensureMigrationsTable(client: pg.Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(client: pg.Client): Promise<Set<string>> {
  const { rows } = await client.query<{ filename: string }>(
    `SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY filename`,
  );
  return new Set(rows.map((row) => row.filename));
}

/**
 * One-time baseline for databases that predated schema_migrations tracking.
 * Marks every current drizzle file as applied without executing SQL.
 */
async function baselineExistingDatabase(
  client: pg.Client,
  files: string[],
  applied: Set<string>,
) {
  if (applied.size > 0) return;

  const { rows } = await client.query<{ reg: string | null }>(
    "SELECT to_regclass('public.colleges') AS reg",
  );
  if (!rows[0]?.reg) return;

  for (const file of files) {
    await client.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
      [file],
    );
  }
  console.log(
    `Baselined ${files.length} migrations on existing database (no SQL re-run)`,
  );
}

async function applyPendingMigrations(
  client: pg.Client,
  files: string[],
  drizzleDir: string,
) {
  let applied = await getAppliedMigrations(client);
  await baselineExistingDatabase(client, files, applied);
  applied = await getAppliedMigrations(client);

  const pending = files.filter((file) => !applied.has(file));
  if (pending.length === 0) {
    console.log("No pending migrations");
    return;
  }

  for (const file of pending) {
    const sql = readFileSync(join(drizzleDir, file), "utf8");
    console.log(`Applying ${file}…`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`,
        [file],
      );
      await client.query("COMMIT");
      console.log(`  OK ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

async function main() {
  const databaseUrl = resolveDatabaseUrl();
  const drizzleDir = join(import.meta.dir, "..", "drizzle");
  const files = listMigrationFiles(drizzleDir);

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await ensureMigrationsTable(client);
    await applyPendingMigrations(client, files, drizzleDir);
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
