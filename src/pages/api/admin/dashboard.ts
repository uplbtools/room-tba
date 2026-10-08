import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { getStaffDashboard } from "@lib/services/dashboard-service";

export const prerender = false;

/** Staff landing page data for /admin (auth audit item 15). */
export const GET: APIRoute = async ({ cookies }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requireReview: true,
  });
  if (auth instanceof Response) return auth;

  return new Response(JSON.stringify(await getStaffDashboard(auth.session)), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });
};
