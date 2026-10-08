import { describe, expect, mock, test } from "bun:test";
import type { AstroCookies } from "astro";

mock.module("astro:env/server", () => ({
  ADMIN_SESSION_SECRET: "test-secret-key-for-tests",
  // require-editor pulls in @lib/db for session revalidation; the pg Pool
  // is lazy, so an empty URL is fine — these tests never reach a query.
  DATABASE_URL: "",
}));

const { editorSessionOrUnauthorized, optionalEditorSession } = await import(
  "./require-editor"
);
const { createSessionToken, getSessionUser } = await import("./auth");
const { isSessionVersionCurrent } = await import("./session-version");
const { createHmac } = await import("node:crypto");

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

describe("optionalEditorSession", () => {
  test("is null without a cookie (anonymous visitor)", async () => {
    expect(await optionalEditorSession(mockCookies())).toBeNull();
  });

  test("is null for a forged cookie", async () => {
    expect(await optionalEditorSession(mockCookies("abc.def"))).toBeNull();
  });
});

describe("session version in the signed cookie", () => {
  const user = {
    id: 4,
    username: "ana",
    displayName: "Ana",
    role: "editor" as const,
  };

  test("the token carries the session version it was issued with", () => {
    const token = createSessionToken({ ...user, sessionVersion: 3 });
    expect(getSessionUser(token)?.sessionVersion).toBe(3);
  });

  test("cookies minted before session versions read as version 0", () => {
    const body = Buffer.from(
      JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + 60 }),
    ).toString("base64url");
    const sig = createHmac("sha256", "test-secret-key-for-tests")
      .update(body)
      .digest("base64url");
    expect(getSessionUser(`${body}.${sig}`)?.sessionVersion).toBe(0);
  });

  test("a client cannot raise its own version without breaking the signature", () => {
    const token = createSessionToken({ ...user, sessionVersion: 0 });
    const [body] = token.split(".");
    const payload = JSON.parse(Buffer.from(body!, "base64url").toString());
    payload.sv = 9;
    const forged = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${token.split(".")[1]}`;
    expect(getSessionUser(forged)).toBeNull();
  });
});

describe("isSessionVersionCurrent", () => {
  test("only an exact match is current", () => {
    expect(isSessionVersionCurrent(2, 2)).toBe(true);
    expect(isSessionVersionCurrent(undefined, 0)).toBe(true);
    // Revoked: issued before a bump.
    expect(isSessionVersionCurrent(1, 2)).toBe(false);
    expect(isSessionVersionCurrent(undefined, 1)).toBe(false);
    // Ahead of the DB cannot be legitimately minted.
    expect(isSessionVersionCurrent(3, 2)).toBe(false);
  });
});
