import type { MiddlewareHandler } from "astro";
import { isSupabaseConfigured } from "./env";
import { createServerSupabaseClient } from "./server";

type MiddlewareContext = Parameters<MiddlewareHandler>[0];

/** Refresh the Supabase session and attach the client to `context.locals`. */
export async function refreshSupabaseSession(
  context: MiddlewareContext,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const pendingCacheHeaders: Record<string, string> = {};
  try {
    const supabase = createServerSupabaseClient({
      request: context.request,
      cookies: context.cookies,
      applyCacheHeaders: (headers) => {
        Object.assign(pendingCacheHeaders, headers);
      },
    });

    await supabase.auth.getUser();

    context.locals.supabase = supabase;
    context.locals.supabaseCacheHeaders = pendingCacheHeaders;
  } catch (error) {
    console.error("Supabase session refresh failed:", error);
  }
}

export function applySupabaseCacheHeaders(
  response: Response,
  context: MiddlewareContext,
): Response {
  const cacheHeaders = context.locals.supabaseCacheHeaders;
  if (!cacheHeaders) return response;

  for (const [key, value] of Object.entries(cacheHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}
