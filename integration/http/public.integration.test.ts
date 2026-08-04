import { describe, expect, test, beforeAll } from "bun:test";
import {
  PREVIEW_BASE,
  requirePreview,
  previewFetchInit,
  skipWithoutE2eDb,
} from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

describeIntegration("HTTP redirects", () => {
  beforeAll(async () => {
    await requirePreview(PREVIEW_BASE);
  });

  test("/admin redirects to in-app login", async () => {
    const res = await fetch(`${PREVIEW_BASE}/admin`, { redirect: "manual" });
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("editor=login");
  });

  test("/api/health returns ok", async () => {
    const res = await fetch(`${PREVIEW_BASE}/api/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ok");
  });

  test("GET /api/buildings returns JSON array", async () => {
    const res = await fetch(`${PREVIEW_BASE}/api/buildings`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("GET /api/check returns every sync key in one response (#866)", async () => {
    const res = await fetch(`${PREVIEW_BASE}/api/check`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: Record<string, string | null>;
    };
    expect(body.success).toBe(true);
    // The eight tables the app probes on boot must all be in the one payload.
    for (const table of [
      "buildings",
      "colleges",
      "divisions",
      "dorms",
      "events",
      "classes",
      "organizations",
      "places",
    ]) {
      expect(body.data).toHaveProperty(table);
    }
  });

  test("GET /api/check/[name] still answers for one table (#866 compat)", async () => {
    const res = await fetch(`${PREVIEW_BASE}/api/check/buildings`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { tableName: string | null };
    };
    expect(body.success).toBe(true);
    expect(body.data.tableName).toBe("buildings");
  });

  test("GET /api/classes caps inflated limits and returns the cursor shape", async () => {
    const res = await fetch(`${PREVIEW_BASE}/api/classes?limit=1000000`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      rows: unknown[];
      nextCursor: string | null;
      hasMore: boolean;
    };
    expect(Array.isArray(body.rows)).toBe(true);
    expect(body.rows.length).toBeLessThanOrEqual(100);
    expect(typeof body.hasMore).toBe("boolean");
    expect("nextCursor" in body).toBe(true);
  });

  test("GET /api/classes rejects invalid pagination params", async () => {
    const res = await fetch(`${PREVIEW_BASE}/api/classes?limit=banana`);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("limit");
  });

  test("GET /api/classes rejects the removed offset param", async () => {
    const res = await fetch(`${PREVIEW_BASE}/api/classes?offset=25`);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("cursor");
  });

  test("GET /api/classes rejects a garbage cursor", async () => {
    const res = await fetch(
      `${PREVIEW_BASE}/api/classes?cursor=${encodeURIComponent("!!nope!!")}`,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("cursor");
  });

  test("POST /api/sponsor-event accepts a valid beacon", async () => {
    const res = await fetch(`${PREVIEW_BASE}/api/sponsor-event`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sponsorId: "sample-sponsor",
        zone: "status_bar",
        eventType: "impression",
        pagePath: "/",
      }),
    });
    expect(res.status).toBe(200);
  });

  test("POST /api/sponsor-event rejects a body without sponsorId/zone", async () => {
    const res = await fetch(`${PREVIEW_BASE}/api/sponsor-event`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventType: "impression" }),
    });
    expect(res.status).toBe(400);
  });

  test("POST /api/sponsor-event silently drops bot traffic", async () => {
    const res = await fetch(`${PREVIEW_BASE}/api/sponsor-event`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)",
      },
      body: JSON.stringify({ sponsorId: "sample-sponsor", zone: "status_bar" }),
    });
    expect(res.status).toBe(200);
  });

  test("POST /api/admin/auth rejects bad password", async () => {
    const form = new FormData();
    form.set("username", "e2e-admin");
    form.set("password", "wrong-password");
    const res = await fetch(
      `${PREVIEW_BASE}/api/admin/auth`,
      previewFetchInit({
        method: "POST",
        body: form,
      }),
    );
    expect(res.status).toBe(401);
  });
});
