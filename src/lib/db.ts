import { AsyncLocalStorage } from "node:async_hooks";
import { DATABASE_URL } from "astro:env/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { e2eSchema } from "../../scripts/e2e-schema";

/**
 * On Cloudflare Workers the Postgres connection goes through the Hyperdrive
 * binding; everywhere else (scripts, local dev, Vercel, E2E) DATABASE_URL wins.
 * `cloudflare:workers` only resolves inside workerd, so the import is dynamic.
 * postgres.js is used instead of node-postgres: it is the driver Cloudflare
 * documents for Hyperdrive and avoids `pg`'s Node-only socket deps in the
 * Worker bundle.
 *
 * Pooling is per-request, not per-isolate: workerd ties socket I/O to the
 * request context that created it, so a module-global pool hands later
 * requests dead connections (CONNECTION_CLOSED) and resolves queries in the
 * wrong context, which the runtime cancels into request hangs. Hyperdrive
 * already pools server-side, so a fresh client per request is cheap.
 * `runWithRequestDb` (called from src/middleware.ts) scopes one client to
 * each request; anything outside a request (scripts, build) shares the
 * fallback context, where pooling is safe.
 */
let connectionString = DATABASE_URL;
try {
  const { env } = await import("cloudflare:workers");
  const hyperdrive = (env as { HYPERDRIVE?: { connectionString?: string } })
    .HYPERDRIVE;
  if (hyperdrive?.connectionString) {
    connectionString = hyperdrive.connectionString;
  }
} catch {
  // Not running inside workerd.
}

/** Cap pool size in CI so Playwright + preview stay under Supabase session pooler limits. */
const poolMax = Number(
  process.env["DATABASE_POOL_MAX"] ?? (process.env["CI"] ? "2" : "10"),
);

const runSchema = e2eSchema();

type SqlClient = ReturnType<typeof postgres>;
type Db = ReturnType<typeof drizzle>;

interface DbContext {
  client?: SqlClient;
  db?: Db;
}

const requestDb = new AsyncLocalStorage<DbContext>();
const fallbackContext: DbContext = {};

/** Run `fn` with a fresh database client scoped to this request. */
export function runWithRequestDb<T>(fn: () => T): T {
  return requestDb.run({}, fn);
}

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
  const wrap = <T>(make: () => PromiseLike<T>) => ({
    then: (onFulfilled?: any, onRejected?: any) =>
      withRetry(make).then(onFulfilled, onRejected),
    catch: (onRejected?: any) => withRetry(make).catch(onRejected),
    finally: (onFinally?: any) => withRetry(make).finally(onFinally),
  });
  const query = {
    then: (onFulfilled?: any, onRejected?: any) =>
      wrap(() => makeQuery()).then(onFulfilled, onRejected),
    catch: (onRejected?: any) => wrap(() => makeQuery()).catch(onRejected),
    finally: (onFinally?: any) => wrap(() => makeQuery()).finally(onFinally),
    values: () => wrap(() => makeQuery().values() as PromiseLike<unknown>),
    raw: () => wrap(() => makeQuery().raw() as PromiseLike<unknown>),
    execute: () => wrap(() => makeQuery().execute() as PromiseLike<unknown>),
    simple: () => wrap(() => makeQuery().simple() as PromiseLike<unknown>),
  };
  return query as unknown as UnsafeQuery;
}

function createClient(): SqlClient {
  const client = postgres(connectionString, {
    max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 10,
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
  ctx.client ??= createClient();
  return ctx.client;
}

function contextDb(ctx: DbContext): Db {
  ctx.db ??= drizzle(contextClient(ctx));
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
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = contextDb(currentContext());
    const value = (real as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

/** Tagged-template `sql` client; resolves per access like `db`. */
export const sqlClient = new Proxy(function sqlClient() {}, {
  apply(_target, _thisArg, args: unknown[]) {
    const client = contextClient(currentContext()) as unknown as (
      ...a: unknown[]
    ) => unknown;
    return client(...args);
  },
  get(_target, prop) {
    const client = contextClient(currentContext()) as unknown as Record<
      PropertyKey,
      unknown
    >;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as unknown as SqlClient;
