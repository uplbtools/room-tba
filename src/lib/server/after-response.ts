/**
 * Keep work alive after the response is sent (auth audit item 12).
 *
 * On Vercel the function instance can freeze as soon as the response
 * returns, so a bare `void promise` (the old fire-and-forget emits) may never
 * finish. Vercel exposes the request's `waitUntil` on a global request
 * context; this is the same lookup `@vercel/functions` waitUntil does, without
 * adding that package as a direct dependency for one call.
 *
 * Off Vercel (node adapter for E2E, local dev) there is no such context, so
 * the caller awaits the task itself, bounded by `timeoutMs` so a hung
 * provider cannot hold the request open forever.
 */

type VercelRequestContext = {
  waitUntil?: (promise: Promise<unknown>) => void;
};

const REQUEST_CONTEXT = Symbol.for("@vercel/request-context");

function vercelWaitUntil(): ((promise: Promise<unknown>) => void) | null {
  const holder = (globalThis as Record<symbol, unknown>)[REQUEST_CONTEXT] as
    | { get?: () => VercelRequestContext | undefined }
    | undefined;
  return holder?.get?.()?.waitUntil ?? null;
}

export const AFTER_RESPONSE_TIMEOUT_MS = 10_000;

/**
 * Hand `task` to the platform to finish after the response, or await it with
 * a timeout when there is no platform hook. Never rejects: failures are the
 * task's own business (log inside it).
 */
export async function afterResponse(
  task: Promise<unknown>,
  timeoutMs = AFTER_RESPONSE_TIMEOUT_MS,
): Promise<void> {
  const settled = task.then(
    () => undefined,
    (error) => {
      console.error("Background task failed:", error);
    },
  );
  const waitUntil = vercelWaitUntil();
  if (waitUntil) {
    waitUntil(settled);
    return;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    settled,
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, timeoutMs);
    }),
  ]);
  clearTimeout(timer);
}
