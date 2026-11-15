type VercelRequestContext = { waitUntil?: (promise: Promise<unknown>) => void };

const REQUEST_CONTEXT = Symbol.for('@vercel/request-context');

function vercelWaitUntil(): ((promise: Promise<unknown>) => void) | null {
	const holder = (globalThis as Record<symbol, unknown>)[REQUEST_CONTEXT] as
		{ get?: () => VercelRequestContext | undefined } | undefined;
	return holder?.get?.()?.waitUntil ?? null;
}

/**
 * Let `task` finish after the response on Vercel (the instance can freeze once
 * it returns). Elsewhere await it, up to `timeoutMs`. Never rejects.
 */
export async function afterResponse(task: Promise<unknown>, timeoutMs = 10_000): Promise<void> {
	const settled = task.then(
		() => undefined,
		(error) => {
			console.error('Background task failed:', error);
		}
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
		})
	]);
	clearTimeout(timer);
}
