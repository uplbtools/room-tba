import { DATABASE_URL } from "astro:env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/** Cap pool size in CI so Playwright + preview stay under Supabase session pooler limits. */
const poolMax = Number(
  process.env.DATABASE_POOL_MAX ?? (process.env.CI ? "4" : "10"),
);

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 10,
  idleTimeoutMillis: 10_000,
});

export const db = drizzle(pool);
