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
