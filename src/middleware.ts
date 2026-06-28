import { defineMiddleware } from "astro:middleware";
import { getSessionUser, ADMIN_COOKIE_NAME } from "./lib/admin/auth";
import {
  applySupabaseCacheHeaders,
  refreshSupabaseSession,
} from "./lib/supabase/session";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  await refreshSupabaseSession(context);

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi =
    pathname.startsWith("/api/admin") && pathname !== "/api/admin/auth";

  if (isAdminPage) {
    return applySupabaseCacheHeaders(context.redirect("/?editor=login"), context);
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

  return applySupabaseCacheHeaders(await next(), context);
});
