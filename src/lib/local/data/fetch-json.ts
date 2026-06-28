export type FetchJsonWithRetryOptions = {
  attempts?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

/** Full jitter: random delay in [0, min(maxDelayMs, baseDelayMs * 2^attempt)]. */
export function jitteredBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return Math.floor(Math.random() * cap);
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Lightweight profile for sync-key probes. */
export const SYNC_CHECK_FETCH_OPTIONS: FetchJsonWithRetryOptions = {
  attempts: 6,
  timeoutMs: 25_000,
  baseDelayMs: 800,
  maxDelayMs: 20_000,
};

/** Heavier profile for full entity payloads on flaky campus Wi-Fi. */
export const ENTITY_FETCH_OPTIONS: FetchJsonWithRetryOptions = {
  attempts: 8,
  timeoutMs: 30_000,
  baseDelayMs: 1_000,
  maxDelayMs: 45_000,
};

export async function fetchJsonWithRetry<T>(
  url: string,
  {
    attempts = ENTITY_FETCH_OPTIONS.attempts ?? 8,
    timeoutMs = ENTITY_FETCH_OPTIONS.timeoutMs ?? 30_000,
    baseDelayMs = ENTITY_FETCH_OPTIONS.baseDelayMs ?? 1_000,
    maxDelayMs = ENTITY_FETCH_OPTIONS.maxDelayMs ?? 45_000,
  }: FetchJsonWithRetryOptions = ENTITY_FETCH_OPTIONS,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status}) for ${url}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await sleep(jitteredBackoffDelay(attempt, baseDelayMs, maxDelayMs));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Request failed for ${url}`);
}
