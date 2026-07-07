import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { clampLimitParam, paginationErrorResponse } from "@lib/api/pagination";
import { db } from "@lib/db";
import { aliasesTable } from "@drizzle/schema";
import { ilike, sql } from "drizzle-orm";
import { normalizeAlias } from "@lib/site";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** List aliases with optional search. */
export const GET: APIRoute = async ({ cookies, url }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = clampLimitParam(url.searchParams.get("limit"), {
    defaultValue: 50,
    max: 200,
  });
  if (!limit.ok) return paginationErrorResponse(limit.error);

  try {
    const rows = await db
      .select()
      .from(aliasesTable)
      .where(q ? ilike(aliasesTable.alias, `%${q}%`) : sql`true`)
      .limit(limit.value);
    return json({ data: rows });
  } catch (err) {
    console.error("Failed to list aliases:", err);
    return json({ error: "Failed to list aliases" }, 500);
  }
};

/** Create a new alias. */
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

  const aliasText = typeof body.alias === "string" ? body.alias.trim() : "";
  const targetType =
    typeof body.targetType === "string" ? body.targetType.trim() : "";
  const targetId = Number(body.targetId);

  if (!aliasText || !targetType || !Number.isFinite(targetId)) {
    return json({ error: "alias, targetType, and targetId are required" }, 400);
  }

  const normalized = normalizeAlias(aliasText);

  try {
    const [row] = await db
      .insert(aliasesTable)
      .values({
        alias: aliasText,
        normalizedAlias: normalized,
        targetType,
        targetId,
        source: "admin",
        confidence: "verified",
      })
      .onConflictDoNothing({
        target: [
          aliasesTable.normalizedAlias,
          aliasesTable.targetType,
          aliasesTable.targetId,
        ],
      })
      .returning();
    if (!row) {
      return json({ error: "Alias already exists for this target" }, 409);
    }
    return json({ success: true, alias: row }, 201);
  } catch (err) {
    console.error("Failed to create alias:", err);
    return json({ error: "Failed to create alias" }, 500);
  }
};

/** Bulk-delete aliases by IDs. */
export const DELETE: APIRoute = async ({ cookies, request }) => {
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

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((n): n is number => Number.isFinite(n))
    : [];
  if (ids.length === 0) {
    return json({ error: "ids array is required" }, 400);
  }

  try {
    await db
      .delete(aliasesTable)
      .where(
        sql`${aliasesTable.id} IN (${sql.join(ids.map((id) => sql`${id}`))})`,
      );
    return json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("Failed to delete aliases:", err);
    return json({ error: "Failed to delete aliases" }, 500);
  }
};
