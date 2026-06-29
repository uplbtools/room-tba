import { defineMiddleware } from "astro:middleware";
import { getSessionUser, ADMIN_COOKIE_NAME } from "./lib/admin/auth";
import {
  applySupabaseCacheHeaders,
  refreshSupabaseSession,
} from "./lib/supabase/session";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const start = performance.now();

  await refreshSupabaseSession(context);

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi =
    pathname.startsWith("/api/admin") && pathname !== "/api/admin/auth";

  if (isAdminPage) {
    return applySupabaseCacheHeaders(
      context.redirect("/?editor=login"),
      context,
    );
  }

  if (isAdminApi) {
    const cookie = context.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!getSessionUser(cookie)) {
      return applySupabaseCacheHeaders(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
        context,
      );
    }
  }

  const response = await next();
  const duration = Math.round(performance.now() - start);

  // Add Server-Timing header for API routes so Vercel logs and browsers
  // can surface slow endpoints during QA (#313).
  if (pathname.startsWith("/api/")) {
    response.headers.set(
      "Server-Timing",
      `handler;dur=${duration},desc="Astro route handler"`,
    );
    if (duration > 500) {
      console.warn(`[Slow API] ${pathname} took ${duration}ms`);
    }
  }

  return applySupabaseCacheHeaders(response, context);
});
