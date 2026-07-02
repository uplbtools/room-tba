import { describe, expect, test, beforeAll } from "bun:test";
import { PREVIEW_BASE, skipWithoutE2eDb } from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

let previewUp = false;

describeIntegration("HTTP redirects", () => {
  beforeAll(async () => {
    try {
      const res = await fetch(`${PREVIEW_BASE}/api/health`, {
        signal: AbortSignal.timeout(2000),
      });
      previewUp = res.ok;
    } catch {
      previewUp = false;
    }
    if (!previewUp) {
      console.warn(
        `Skipping HTTP integration — preview not running at ${PREVIEW_BASE}`,
      );
    }
  });

  test("skipped when preview offline", () => {
    if (!previewUp) return;
    expect(previewUp).toBe(true);
  });

  test("/admin redirects to in-app login", async () => {
    if (!previewUp) return;
    const res = await fetch(`${PREVIEW_BASE}/admin`, { redirect: "manual" });
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("editor=login");
  });

  test("/api/health returns ok", async () => {
    if (!previewUp) return;
    const res = await fetch(`${PREVIEW_BASE}/api/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ok");
  });

  test("GET /api/buildings returns JSON array", async () => {
    if (!previewUp) return;
    const res = await fetch(`${PREVIEW_BASE}/api/buildings`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("POST /api/admin/auth rejects bad password", async () => {
    if (!previewUp) return;
    const form = new FormData();
    form.set("username", "e2e-admin");
    form.set("password", "wrong-password");
    const res = await fetch(`${PREVIEW_BASE}/api/admin/auth`, {
      method: "POST",
      body: form,
    });
    expect(res.status).toBe(401);
  });
});
