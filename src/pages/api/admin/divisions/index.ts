import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { createDivision } from "@lib/services/admin-service";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ cookies, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requirePublish: true,
  });
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const divisionName =
    typeof body.divisionName === "string" ? body.divisionName.trim() : "";
  if (!divisionName) {
    return json({ error: "Division name is required" }, 400);
  }

  const collegeId =
    body.collegeId === null || body.collegeId === undefined
      ? null
      : Number(body.collegeId);
  if (collegeId !== null && !Number.isInteger(collegeId)) {
    return json({ error: "College must be a valid selection" }, 400);
  }

  try {
    const division = await createDivision(
      { divisionName, collegeId },
      auth.editedBy,
    );
    if (!division) {
      return json({ error: "Failed to create division" }, 500);
    }
    return json({ success: true, division }, 201);
  } catch (err) {
    console.error("Failed to create division:", err);
    return json({ error: "Failed to create division" }, 500);
  }
};
