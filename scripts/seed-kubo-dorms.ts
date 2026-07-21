/**
 * Seed local Postgres with dorms used to test the optional Kubo CTA.
 *
 * This script is intentionally restricted to loopback database hosts. It uses
 * the production dorm IDs because the curated Kubo mapping is keyed by ID.
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { loadEnv } from "./load-env";

loadEnv();

export const KUBO_DORM_SEED = [
  {
    id: 10,
    dormName: "Centtro Residences",
    shortName: "Centtro",
    lat: 14.1706661,
    lon: 121.2442563,
    gender: "coed",
    hasKuboListing: false,
  },
  {
    id: 11,
    dormName: "Koru Residences",
    shortName: "Koru",
    lat: 14.1695,
    lon: 121.244,
    gender: "female",
    hasKuboListing: false,
  },
  {
    id: 12,
    dormName: "Arable Premier Residences",
    shortName: "Arable",
    lat: 14.1663791,
    lon: 121.2381389,
    gender: "coed",
    hasKuboListing: true,
  },
  {
    id: 13,
    dormName: "Westbrook Residences",
    shortName: "Westbrook",
    lat: 14.1676929,
    lon: 121.2388231,
    gender: "coed",
    hasKuboListing: false,
  },
  {
    id: 14,
    dormName: "One Silangan Place",
    shortName: "Silangan",
    lat: 14.1672495,
    lon: 121.243932,
    gender: "coed",
    hasKuboListing: false,
  },
  {
    id: 15,
    dormName: "Scholar's Dormitory",
    shortName: "Scholar's",
    lat: 14.1600427,
    lon: 121.2405213,
    gender: "coed",
    hasKuboListing: true,
  },
] as const;

const LOCAL_DATABASE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

export function assertLocalDatabase(connectionString: string): void {
  const databaseUrl = new URL(connectionString);
  if (!LOCAL_DATABASE_HOSTS.has(databaseUrl.hostname)) {
    throw new Error(
      `Refusing to seed non-local database host: ${databaseUrl.hostname}`,
    );
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  assertLocalDatabase(connectionString);

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await client.query("BEGIN");

    for (const dorm of KUBO_DORM_SEED) {
      const existing = await client.query<{ dorm_name: string }>(
        "SELECT dorm_name FROM dorms WHERE id = $1",
        [dorm.id],
      );
      const existingName = existing.rows[0]?.dorm_name;
      if (existingName && existingName !== dorm.dormName) {
        throw new Error(
          `Dorm ID ${dorm.id} already belongs to ${existingName}; refusing to overwrite it`,
        );
      }

      await client.query(
        `INSERT INTO dorms
          (id, dorm_name, short_name, lat, lon, gender, is_up_managed, price_range, version)
         VALUES ($1, $2, $3, $4, $5, $6, false, 'Inquire for rates', 1)
         ON CONFLICT (id) DO UPDATE SET
           dorm_name = EXCLUDED.dorm_name,
           short_name = EXCLUDED.short_name,
           lat = EXCLUDED.lat,
           lon = EXCLUDED.lon,
           gender = EXCLUDED.gender,
           is_up_managed = EXCLUDED.is_up_managed,
           price_range = EXCLUDED.price_range`,
        [
          dorm.id,
          dorm.dormName,
          dorm.shortName,
          dorm.lat,
          dorm.lon,
          dorm.gender,
        ],
      );
    }

    await client.query(
      `SELECT setval(
        pg_get_serial_sequence('dorms', 'id'),
        GREATEST((SELECT MAX(id) FROM dorms), 1),
        true
      )`,
    );
    await client.query(
      `INSERT INTO update (table_name, sync_key) VALUES ('dorms', $1)
       ON CONFLICT (table_name) DO UPDATE SET sync_key = EXCLUDED.sync_key`,
      [randomUUID()],
    );

    await client.query("COMMIT");
    console.log(
      JSON.stringify({
        ok: true,
        mappedDormIds: KUBO_DORM_SEED.filter((dorm) => dorm.hasKuboListing).map(
          (dorm) => dorm.id,
        ),
        unmappedDormIds: KUBO_DORM_SEED.filter(
          (dorm) => !dorm.hasKuboListing,
        ).map((dorm) => dorm.id),
      }),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
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
