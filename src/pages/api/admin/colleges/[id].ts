import type { APIRoute } from "astro";
import {
  ADMIN_COOKIE_NAME,
  verifySessionToken,
} from "../../../../lib/admin/auth";
import {
  EditConflictError,
  updateCollege,
} from "../../../../lib/services/admin-service";

export const prerender = false;

type CollegePatchBody = {
  collegeName?: string;
  version?: number;
};

export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  if (!verifySessionToken(cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const id = parseInt(params["id"] ?? "");
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: "Invalid college ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: CollegePatchBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.collegeName || body.collegeName.trim().length === 0) {
    return new Response(JSON.stringify({ error: "College name is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const expectedVersion = Number.isInteger(body.version)
    ? body.version
    : undefined;

  try {
    const college = await updateCollege(
      id,
      body.collegeName.trim(),
      expectedVersion,
    );

    return new Response(JSON.stringify({ success: true, college }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof EditConflictError) {
      return new Response(
        JSON.stringify({
          error: "This college was changed by another editor.",
          latest: err.latest,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.error("Failed to update college:", err);
    return new Response(JSON.stringify({ error: "Failed to save college" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
