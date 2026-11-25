import { AsyncLocalStorage } from "node:async_hooks";
import { DATABASE_URL } from "astro:env/server";
import type { drizzle as drizzleNodePgFn } from "drizzle-orm/node-postgres";
import type { drizzle as drizzlePostgresJsFn } from "drizzle-orm/postgres-js";
import type { Pool as PgPool } from "pg";
import type postgresFn from "postgres";
import { e2eSchema } from "../../scripts/e2e-schema";

/**
 * The database driver switches on the runtime:
 *
 * - workerd (Cloudflare Workers) → postgres.js. `pg`'s Node-only socket
 *   deps cannot run there, and postgres.js is the driver Cloudflare
 *   documents for Hyperdrive. Pooling is per-request, not per-isolate:
 *   workerd ties socket I/O to the request context that created it, so a
 *   module-global pool hands later requests dead connections
 *   (CONNECTION_CLOSED) and resolves queries in the wrong context, which
 *   the runtime cancels into request hangs. Hyperdrive already pools
 *   server-side, so a fresh client per request is cheap.
 *   `runWithRequestDb` (called from src/middleware.ts) scopes one client
 *   to each request; anything outside a request shares the fallback
 *   context, where pooling is safe.
 * - everywhere else (Vercel, local dev, scripts, E2E) → node-postgres,
 *   unchanged from upstream.
 *
 * `cloudflare:workers` only resolves inside workerd, so the detection and
 * driver imports are dynamic; `pg` never enters the Worker bundle path.
 */
const runSchema = e2eSchema();

/** Cap pool size in CI so Playwright + preview stay under Supabase session pooler limits. */
const poolMax = Number(
  process.env["DATABASE_POOL_MAX"] ?? (process.env["CI"] ? "2" : "10"),
);

let inWorkerd = false;
let hyperdriveConnectionString: string | undefined;
try {
  const { env } = await import("cloudflare:workers");
  inWorkerd = true;
  hyperdriveConnectionString = (
    env as { HYPERDRIVE?: { connectionString?: string } }
  ).HYPERDRIVE?.connectionString;
} catch {
  // Not running inside workerd.
}

// Caller-facing type stays the node-postgres drizzle flavor so existing
// call sites keep their upstream typings; the postgres.js instance is
// structurally compatible for the query surface the app uses.
type Db = ReturnType<typeof drizzleNodePgFn>;
type SqlClient = ReturnType<typeof postgresFn>;
type WorkerDb = ReturnType<typeof drizzlePostgresJsFn>;

interface DbContext {
  client?: SqlClient;
  db?: WorkerDb;
  /** Pool size for the lazily created client; request scopes cap at 1. */
  max?: number;
}

const requestDb = new AsyncLocalStorage<DbContext>();
const fallbackContext: DbContext = {};

/**
 * Run `fn` with a fresh database client scoped to this request (workerd only).
 * The client is capped at one connection — a request's queries serialize
 * through the pool queue instead of holding several sockets — and must be
 * released with `endRequestDb` once the response is done.
 */
export function runWithRequestDb<T>(fn: () => T): T {
  return inWorkerd ? requestDb.run({ max: 1 }, fn) : fn();
}

/**
 * Close the request-scoped client, if this async context created one.
 * No-op outside workerd or when the request never touched the database.
 * Errors are swallowed: a failed close must not fail the response.
 */
export async function endRequestDb(): Promise<void> {
  const ctx = requestDb.getStore();
  const client = ctx?.client;
  if (!client) return;
  ctx.client = undefined;
  ctx.db = undefined;
  try {
    await client.end({ timeout: 5 });
  } catch {
    // Connection already gone; nothing to clean up.
  }
}

/* ------------------------------------------------------------------ */
/* workerd path: postgres.js, per-request clients                      */
/* ------------------------------------------------------------------ */

/**
 * Worker sockets to `*.hyperdrive.local` can still go stale between the
 * queries of a single request (idle TCP reclaimed without a close event),
 * so the first query on a pooled connection occasionally dies with
 * CONNECTION_CLOSED or a reset. postgres.js reconnects lazily but does not
 * retry the failed query, so `unsafe` retries once on transport-level
 * failures: the second attempt lands on a fresh connection. Query errors
 * never retry.
 */
const RETRYABLE_CONNECTION_ERROR =
  /CONNECTION_CLOSED|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|EAI_AGAIN|proxy request failed|Connection terminated|terminating connection|server closed the connection/i;

function isRetryableConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return RETRYABLE_CONNECTION_ERROR.test(message);
}

type UnsafeQuery = ReturnType<SqlClient["unsafe"]>;
type UnsafeArgs = Parameters<SqlClient["unsafe"]>;

/**
 * postgres.js resolves queries to a `Result` (an Array subclass) with no
 * `.rows` property, while node-postgres returned `{ rows: [...] }`. Callers
 * written against `db.execute(...).rows` would silently read `undefined`, so
 * expose the array itself as a non-enumerable `rows` self-reference. JSON
 * serialization is unaffected because the property is non-enumerable.
 */
function withRowsCompat<T>(value: T): T {
  if (
    Array.isArray(value) &&
    (value as { rows?: unknown }).rows === undefined
  ) {
    Object.defineProperty(value, "rows", {
      get: () => value,
      enumerable: false,
      configurable: true,
    });
  }
  return value;
}

function withRetry<T>(make: () => PromiseLike<T>): Promise<T> {
  const attempt = (retriesLeft: number): Promise<T> =>
    Promise.resolve(make())
      .then(withRowsCompat)
      .catch((error: unknown) => {
        if (retriesLeft > 0 && isRetryableConnectionError(error)) {
          return attempt(retriesLeft - 1);
        }
        return Promise.reject(error);
      });
  return attempt(1);
}

/** Thenable stand-in for a postgres.js Query that retries once on stale sockets. */
function retryingQuery(makeQuery: () => UnsafeQuery): UnsafeQuery {
  // Memoize the retry promise per terminal accessor: this thenable can be
  // awaited through .then/.catch/.finally and the postgres.js variants
  // .values/.raw/.execute/.simple, and each shape must run the SQL once.
  const settled = new Map<() => PromiseLike<unknown>, Promise<unknown>>();
  const run = (make: () => PromiseLike<unknown>) => {
    let promise = settled.get(make);
    if (!promise) {
      promise = withRetry(make);
      settled.set(make, promise);
    }
    return promise;
  };
  const base = () => makeQuery() as unknown as PromiseLike<unknown>;
  const query = {
    // biome-ignore lint/suspicious/noThenProperty: intentional thenable — this object stands in for a postgres.js Query
    then: (onFulfilled?: any, onRejected?: any) =>
      run(base).then(onFulfilled, onRejected),
    catch: (onRejected?: any) => run(base).catch(onRejected),
    finally: (onFinally?: any) => run(base).finally(onFinally),
    values: () => run(() => makeQuery().values() as PromiseLike<unknown>),
    raw: () => run(() => makeQuery().raw() as PromiseLike<unknown>),
    execute: () => run(() => makeQuery().execute() as PromiseLike<unknown>),
    simple: () => run(() => makeQuery().simple() as PromiseLike<unknown>),
  };
  return query as unknown as UnsafeQuery;
}

function makeWorkerDb(
  postgres: typeof postgresFn,
  drizzlePjs: typeof drizzlePostgresJsFn,
) {
  function createClient(max: number): SqlClient {
    const client = postgres(hyperdriveConnectionString ?? DATABASE_URL, {
      max: Number.isFinite(max) && max > 0 ? Math.floor(max) : 10,
      idle_timeout: 10,
      connect_timeout: 10,
      max_lifetime: 60 * 30,
      // #773: pin every connection to the per-run E2E schema. Sent as a startup
      // parameter, which Postgres accepts for any GUC.
      ...(runSchema ? { connection: { search_path: runSchema } } : {}),
    });
    const rawUnsafe = client.unsafe.bind(client);
    client.unsafe = ((...args: UnsafeArgs) =>
      retryingQuery(() => rawUnsafe(...args))) as typeof client.unsafe;
    return client;
  }

  function contextClient(ctx: DbContext): SqlClient {
    // Request-scoped contexts carry max: 1; the fallback context (scripts,
    // build-time, non-request code) keeps the configured pool size.
    ctx.client ??= createClient(ctx.max ?? poolMax);
    return ctx.client;
  }

  function contextDb(ctx: DbContext): WorkerDb {
    ctx.db ??= drizzlePjs(contextClient(ctx));
    return ctx.db;
  }

  function currentContext(): DbContext {
    return requestDb.getStore() ?? fallbackContext;
  }

  /**
   * `db` resolves its drizzle instance per access, so every call inside a
   * request (middleware or endpoint) lands on that request's client while
   * scripts and build-time code share the fallback pool.
   */
  return new Proxy({} as Db, {
    get(_target, prop) {
      const real = contextDb(currentContext()) as unknown as Db;
      const value = (real as unknown as Record<PropertyKey, unknown>)[prop];
      return typeof value === "function" ? value.bind(real) : value;
    },
  });
}

/* ------------------------------------------------------------------ */
/* node path: node-postgres Pool (unchanged from upstream)             */
/* ------------------------------------------------------------------ */

async function makeNodeDb(): Promise<Db> {
  const [{ Pool }, { drizzle: drizzleNodePg }] = await Promise.all([
    import("pg"),
    import("drizzle-orm/node-postgres"),
  ]);

  const pool: PgPool = new Pool({
    connectionString: DATABASE_URL,
    max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 10,
    idleTimeoutMillis: 10_000,
  });

  /**
   * #773: pin every pooled connection to the per-run E2E schema.
   * node-postgres queues this ahead of user queries on the same physical
   * connection, so the first query already sees it (the session pooler
   * ignores search_path passed through the URL or client `options`).
   */
  if (runSchema) {
    pool.on("connect", (client) => {
      void client.query(`SET search_path TO ${runSchema}`);
    });
  }

  return drizzleNodePg(pool) as unknown as Db;
}

const db: Db = inWorkerd
  ? makeWorkerDb(
      (await import("postgres")).default,
      (await import("drizzle-orm/postgres-js")).drizzle,
    )
  : await makeNodeDb();

export { db };
