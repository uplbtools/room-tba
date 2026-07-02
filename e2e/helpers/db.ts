import { config } from "dotenv";
import pg from "pg";

config({ path: ".env" });

const E2E_PROJECT_REF = "yhzinxlakcewqjaqbbaj";

export function e2eDatabaseUrl(): string | null {
  const url =
    process.env.E2E_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  if (!url.includes(E2E_PROJECT_REF)) return null;
  return url;
}

export async function withE2eClient<T>(
  fn: (client: pg.Client) => Promise<T>,
): Promise<T | null> {
  const url = e2eDatabaseUrl();
  if (!url) return null;
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function getBuildingCoords(id = 1) {
  return withE2eClient(async (client) => {
    const { rows } = await client.query<{ lat: number; lon: number }>(
      `SELECT lat, lon FROM buildings WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  });
}

export async function countEditorHistory(entityType: string, entityId: number) {
  return withE2eClient(async (client) => {
    const { rows } = await client.query<{ c: string }>(
      `SELECT count(*)::text AS c FROM editor_history WHERE entity_type = $1 AND entity_id = $2`,
      [entityType, entityId],
    );
    return Number(rows[0]?.c ?? 0);
  });
}

const VERSIONED_TABLES = new Set(["rooms", "buildings", "dorms"]);

export async function bumpEntityVersion(table: string, id: number) {
  if (!VERSIONED_TABLES.has(table)) {
    throw new Error(`Unsupported table: ${table}`);
  }
  return withE2eClient(async (client) => {
    await client.query(
      `UPDATE ${table} SET version = version + 1 WHERE id = $1`,
      [id],
    );
  });
}
