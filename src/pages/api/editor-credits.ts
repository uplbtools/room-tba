import type { APIRoute } from "astro";
import { getEditorCredits } from "@lib/services/editor-credits-service";

export const prerender = false;

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await getEditorCredits()), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
