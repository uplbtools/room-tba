/**
 * Prod migrations apply on push to main while Vercel deploys in parallel, so
 * new code can briefly run against a database without its tables/columns.
 * Callers use this to degrade (skip the write, skip the check) instead of
 * failing the request: 42P01 undefined_table, 42703 undefined_column.
 */
export function isMissingSchemaError(error: unknown): boolean {
  const code =
    (error as { code?: string })?.code ??
    (error as { cause?: { code?: string } })?.cause?.code;
  return code === "42P01" || code === "42703";
}
