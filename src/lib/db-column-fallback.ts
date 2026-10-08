/**
 * Deploy-order guard. Production migrations run in release.yml while Vercel
 * deploys the same commit in parallel, so new code can briefly meet a database
 * without its new columns. Postgres answers that with 42703 (undefined_column);
 * callers fall back to the pre-migration query instead of failing the request.
 */

const UNDEFINED_COLUMN = "42703";

/** True for Postgres "column does not exist", including drizzle-wrapped errors. */
export function isUndefinedColumnError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    if (
      typeof current === "object" &&
      (current as { code?: unknown }).code === UNDEFINED_COLUMN
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * Run `primary`; if the database lacks a column it uses, run `fallback`.
 * Any other error propagates unchanged.
 */
export async function withUndefinedColumnFallback<T>(
  label: string,
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (!isUndefinedColumnError(error)) throw error;
    console.warn(`${label}: column missing, using pre-migration query`);
    return fallback();
  }
}
