import { DATABASE_URL } from "astro:env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { e2eSchema } from "../../scripts/e2e-schema";

/** Cap pool size in CI so Playwright + preview stay under Supabase session pooler limits. */
const poolMax = Number(
  process.env.DATABASE_POOL_MAX ?? (process.env.CI ? "2" : "10"),
);

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 10,
  idleTimeoutMillis: 10_000,
});

/**
 * #773: pin every pooled connection to the per-run E2E schema. node-postgres
 * queues this ahead of user queries on the same physical connection, so the
 * first query already sees it (the session pooler ignores search_path passed
 * through the URL or client `options`).
 */
const runSchema = e2eSchema();
if (runSchema) {
  pool.on("connect", (client) => {
    void client.query(`SET search_path TO ${runSchema}`);
  });
}

export const db = drizzle(pool);
