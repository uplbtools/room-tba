import { defineMiddleware } from "astro:middleware";
import { bootstrapObservability } from "./lib/observability/bootstrap";
import { getSessionUser, ADMIN_COOKIE_NAME } from "./lib/admin/auth";
import { runWithRequestDb } from "./lib/db";
import { recordLatency } from "./lib/latency-tracker";
import { applySecurityHeaders } from "./lib/security-headers";

const onRequestHandler = defineMiddleware(async (context, next) => {
  bootstrapObservability();

  const { pathname } = context.url;
  const start = performance.now();

  // /admin itself is a landing page that also serves signed-out and
  // non-staff visitors (roles explainer); only deeper pages need a session.
  const isAdminPage = pathname.startsWith("/admin/") && pathname !== "/admin/";
  // /api/admin/upload also serves anonymous authors of an open proposal
  // (token-checked in the route), so it skips this signed-in pre-filter.
  const isAdminApi =
    pathname.startsWith("/api/admin") &&
    pathname !== "/api/admin/auth" &&
    pathname !== "/api/admin/upload";

  // Resolve editor identity from HMAC cookie (Google OAuth uses same session).
  const editorUser = getSessionUser(
    context.cookies.get(ADMIN_COOKIE_NAME)?.value,
  );

  context.locals.editorUser = editorUser ?? undefined;

  if (isAdminPage) {
    if (!editorUser) {
      return context.redirect("/?editor=login");
    }
  }

  if (isAdminApi) {
    if (!editorUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const response = await next();
  const duration = Math.round(performance.now() - start);
  recordLatency(pathname, duration);

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

  try {
    applySecurityHeaders(response.headers, pathname);
  } catch {
    // Immutable headers (e.g. a Response.redirect): vercel.json still sets
    // the same values at the edge.
  }

  return response;
});

// One Postgres client per request: workerd binds socket I/O to the request
// that created it, so a shared pool resolves queries in the wrong context.
export const onRequest = (
  context: Parameters<typeof onRequestHandler>[0],
  next: Parameters<typeof onRequestHandler>[1],
) => runWithRequestDb(() => onRequestHandler(context, next));
