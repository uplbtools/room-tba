import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import { astroCookieHandlers } from "./cookies";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

export type CreateServerSupabaseOptions = {
  request: Request;
  cookies: AstroCookies;
  /** Apply CDN cache-busting headers when auth cookies refresh. */
  applyCacheHeaders?: (headers: Record<string, string>) => void;
};

/** SSR Supabase client for Astro pages, API routes, and middleware. */
export function createServerSupabaseClient({
  request,
  cookies,
  applyCacheHeaders,
}: CreateServerSupabaseOptions): SupabaseClient {
  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: astroCookieHandlers(request, cookies, applyCacheHeaders),
  });
}

/** Convenience wrapper for `.astro` frontmatter with `Astro.response`. */
export function createServerSupabaseFromAstro(astro: {
  request: Request;
  cookies: AstroCookies;
  response: { headers: Headers };
}): SupabaseClient {
  return createServerSupabaseClient({
    request: astro.request,
    cookies: astro.cookies,
    applyCacheHeaders: (headers) => {
      for (const [key, value] of Object.entries(headers)) {
        astro.response.headers.set(key, value);
      }
    },
  });
}
