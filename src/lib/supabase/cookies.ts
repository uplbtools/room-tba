import { parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";

type CookieOptions = Parameters<AstroCookies["set"]>[2];

export type SupabaseCookieHandlers = {
  getAll(): { name: string; value: string }[];
  setAll(
    cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
    cacheHeaders?: Record<string, string>,
  ): void;
};

export function astroCookieHandlers(
  request: Request,
  cookies: AstroCookies,
  onCacheHeaders?: (headers: Record<string, string>) => void,
): SupabaseCookieHandlers {
  return {
    getAll() {
      return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
        ({ name, value }) => ({
          name,
          value: value ?? "",
        }),
      );
    },
    setAll(cookiesToSet, cacheHeaders) {
      cookiesToSet.forEach(({ name, value, options }) => {
        cookies.set(name, value, options);
      });
      if (cacheHeaders && onCacheHeaders) {
        onCacheHeaders(cacheHeaders);
      }
    },
  };
}
