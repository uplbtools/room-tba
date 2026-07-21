import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { getMyContributions } from "@lib/services/contribution-service";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  try {
    return json({ contributions: await getMyContributions(auth.session.id) });
  } catch (error) {
    console.error("my contributions query failed:", error);
    return json({ error: "Contributions are temporarily unavailable." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
