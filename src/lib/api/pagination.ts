export type LimitOptions = {
  defaultValue: number;
  max: number;
  min?: number;
};

export type PaginationParamResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

function parseNonNegativeInteger(
  name: string,
  raw: string | null,
): PaginationParamResult | { ok: true; value: undefined } {
  const value = raw?.trim();
  if (!value) return { ok: true, value: undefined };

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return {
      ok: false,
      error: `${name} must be a non-negative integer`,
    };
  }
  return { ok: true, value: parsed };
}

export function clampLimitValue(
  value: number | undefined,
  { defaultValue, max, min = 1 }: LimitOptions,
) {
  if (value == null || !Number.isFinite(value)) return defaultValue;
  return Math.min(Math.max(Math.trunc(value), min), max);
}

export function clampLimitParam(
  raw: string | null,
  options: LimitOptions,
): PaginationParamResult {
  const parsed = parseNonNegativeInteger("limit", raw);
  if (!parsed.ok) return parsed;
  return { ok: true, value: clampLimitValue(parsed.value, options) };
}

export function clampOffsetParam(raw: string | null): PaginationParamResult {
  const parsed = parseNonNegativeInteger("offset", raw);
  if (!parsed.ok) return parsed;
  return { ok: true, value: parsed.value ?? 0 };
}

export function paginationErrorResponse(error: string) {
  return new Response(JSON.stringify({ error }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}
