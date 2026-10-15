/**
 * Per-run Postgres schema isolation for the shared E2E database (#773).
 *
 * `E2E_SCHEMA` unset → everything runs against `public` (local default).
 * `E2E_SCHEMA` set → every connection in the run is pinned to that schema, so
 * blocking, advisory, and staging E2E jobs stop writing each other's tables.
 *
 * The Supabase session pooler silently drops `?options=-csearch_path=…` from the
 * connection string and rejects node-postgres `options`, so `search_path` has to
 * be set with a query right after connect.
 */
import pg from 'pg';

export const E2E_SCHEMA_PATTERN = /^e2e_[a-z0-9_]+$/;

export type E2eClient = pg.Client;

/** Validated run schema, or null when running against `public`. */
export function e2eSchema(): string | null {
	const schema = process.env.E2E_SCHEMA?.trim();
	if (!schema) return null;
	if (!E2E_SCHEMA_PATTERN.test(schema)) {
		throw new Error(
			`Refusing to use E2E_SCHEMA "${schema}": must match ${E2E_SCHEMA_PATTERN} (never "public").`
		);
	}
	return schema;
}

/** Connected `pg.Client` pinned to the run schema. */
export async function connectE2eClient(connectionString: string): Promise<E2eClient> {
	const schema = e2eSchema();
	const client = new pg.Client({ connectionString });
	await client.connect();
	if (schema) await client.query(`SET search_path TO ${schema}`);
	return client;
}
