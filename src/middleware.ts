import { defineMiddleware } from "astro:middleware";
import { verifySessionToken, ADMIN_COOKIE_NAME } from "./lib/admin/auth";

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi =
    pathname.startsWith("/api/admin") && pathname !== "/api/admin/auth";

  if (isAdminPage) {
    return context.redirect("/?editor=login");
  }

  if (isAdminApi) {
    const cookie = context.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!verifySessionToken(cookie)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return next();
});
