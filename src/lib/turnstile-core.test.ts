import { afterEach, describe, expect, test } from "bun:test";
import {
  turnstileMayBeUnconfigured,
  verifyTurnstileToken,
} from "./turnstile-core";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("verifyTurnstileToken", () => {
  test("fails closed when unconfigured (empty secret)", async () => {
    expect(await verifyTurnstileToken(null, "")).toBe(false);
    expect(await verifyTurnstileToken("some-token", "   ")).toBe(false);
  });

  test("passes unconfigured only with the explicit opt-out", async () => {
    const opts = { allowUnconfigured: true };
    expect(await verifyTurnstileToken(null, "", opts)).toBe(true);
    expect(await verifyTurnstileToken("some-token", "", opts)).toBe(true);
  });

  test("the opt-out never bypasses a configured secret", async () => {
    expect(
      await verifyTurnstileToken(null, "secret", { allowUnconfigured: true }),
    ).toBe(false);
  });

  test("rejects a missing token when configured", async () => {
    expect(await verifyTurnstileToken(null, "secret")).toBe(false);
    expect(await verifyTurnstileToken(undefined, "secret")).toBe(false);
  });

  test("accepts a token Cloudflare confirms as valid", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: true }), {
        status: 200,
      })) as typeof fetch;
    expect(await verifyTurnstileToken("good-token", "secret")).toBe(true);
  });

  test("trims secret whitespace and never sends remoteip", async () => {
    let posted: string | null = null;
    globalThis.fetch = (async (_url, init) => {
      posted = String(init?.body ?? "");
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as typeof fetch;
    expect(await verifyTurnstileToken("good-token", "  secret  ")).toBe(true);
    expect(posted).toContain("secret=secret");
    expect(posted).not.toContain("remoteip");
  });

  test("rejects a token Cloudflare marks invalid", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: false }), {
        status: 200,
      })) as typeof fetch;
    expect(await verifyTurnstileToken("bad-token", "secret")).toBe(false);
  });

  test("rejects on a non-2xx siteverify response", async () => {
    globalThis.fetch = (async () =>
      new Response("", { status: 500 })) as typeof fetch;
    expect(await verifyTurnstileToken("token", "secret")).toBe(false);
  });

  test("rejects when the network call throws", async () => {
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    expect(await verifyTurnstileToken("token", "secret")).toBe(false);
  });
});

describe("turnstileMayBeUnconfigured", () => {
  test("dev server may run without a secret", () => {
    expect(turnstileMayBeUnconfigured({ dev: true, flag: undefined })).toBe(
      true,
    );
  });

  test("production needs the explicit flag", () => {
    expect(turnstileMayBeUnconfigured({ dev: false, flag: undefined })).toBe(
      false,
    );
    expect(turnstileMayBeUnconfigured({ dev: false, flag: "true" })).toBe(
      false,
    );
    expect(turnstileMayBeUnconfigured({ dev: false, flag: "1" })).toBe(true);
  });
});
