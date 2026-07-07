import { describe, expect, mock, test } from "bun:test";
import type { AstroCookies } from "astro";

mock.module("astro:env/server", () => ({
  ADMIN_PASSWORD: "test-password",
  ADMIN_SESSION_SECRET: "test-secret-key-for-tests",
  // require-editor pulls in @lib/db for session revalidation; the pg Pool
  // is lazy, so an empty URL is fine — these tests never reach a query.
  DATABASE_URL: "",
}));

const { editorSessionOrUnauthorized } = await import("./require-editor");

function mockCookies(value?: string): AstroCookies {
  return {
    get: (name: string) =>
      name === "admin_session" && value ? { value } : undefined,
    has: () => Boolean(value),
    set: () => {},
    delete: () => {},
    merge: () => {},
    headers: () => new Headers(),
  } as AstroCookies;
}

describe("editorSessionOrUnauthorized", () => {
  test("returns 401 when no session cookie is present", async () => {
    const result = await editorSessionOrUnauthorized(mockCookies());
    expect(result).toBeInstanceOf(Response);
    if (result instanceof Response) {
      expect(result.status).toBe(401);
    }
  });

  test("returns 401 for malformed session tokens", async () => {
    const result = await editorSessionOrUnauthorized(
      mockCookies("not-a-valid-token"),
    );
    expect(result).toBeInstanceOf(Response);
    if (result instanceof Response) {
      expect(result.status).toBe(401);
    }
  });
});
