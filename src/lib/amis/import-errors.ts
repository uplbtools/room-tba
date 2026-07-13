/** Operator-facing exit codes for `import-amis-classes` (#318). */
export const AMIS_IMPORT_EXIT = {
  OK: 0,
  USAGE: 1,
  CI_FETCH_BLOCKED: 2,
  MISSING_DATABASE_URL: 3,
  MISSING_EXPORT: 4,
  NO_NORMALIZED_ROWS: 5,
  AUTH_EXPIRED: 10,
  FORBIDDEN: 11,
  RATE_LIMIT: 12,
  SCHEMA_MISMATCH: 13,
  AMIS_UNAVAILABLE: 14,
  UNKNOWN: 99,
} as const;

export type AmisImportErrorCode = keyof typeof AMIS_IMPORT_EXIT;

export class AmisImportError extends Error {
  readonly code: AmisImportErrorCode;

  constructor(code: AmisImportErrorCode, message: string) {
    super(message);
    this.name = "AmisImportError";
    this.code = code;
  }
}

export function amisImportExitCode(code: AmisImportErrorCode): number {
  return AMIS_IMPORT_EXIT[code];
}

export function classifyAmisHttpStatus(status: number): AmisImportErrorCode {
  if (status === 401) return "AUTH_EXPIRED";
  if (status === 403) return "FORBIDDEN";
  if (status === 429) return "RATE_LIMIT";
  if (status >= 500) return "AMIS_UNAVAILABLE";
  return "UNKNOWN";
}

export function operatorHintForCode(code: AmisImportErrorCode): string {
  switch (code) {
    case "AUTH_EXPIRED":
      return "Paste a fresh AMIS bearer token, or import cached JSON with --from-json.";
    case "FORBIDDEN":
      return "AMIS blocked the request. Stop live fetch; use cached JSON and import to Supabase.";
    case "RATE_LIMIT":
      return "Wait and retry --fetch, or import from the last saved JSON export.";
    case "SCHEMA_MISMATCH":
      return "AMIS response shape changed. Fix the parser or use a manual JSON export.";
    case "AMIS_UNAVAILABLE":
      return "AMIS is down. Import from cached JSON; users keep last Supabase/PGlite data.";
    case "MISSING_EXPORT":
      return "Run once with --fetch while the token is valid, or pass --from-json.";
    default:
      return "See docs/amis-contingency-runbook.md.";
  }
}
