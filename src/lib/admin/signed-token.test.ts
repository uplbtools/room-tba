import { describe, expect, test } from "bun:test";
import { createSignedToken, verifySignedToken } from "./signed-token-core";

type Payload = { userId: number; newEmail: string };

const SECRET = "test-secret-at-least-32-chars-long!!";

describe("signed-token", () => {
  test("round-trips a valid token", () => {
    const token = createSignedToken<Payload>(
      { userId: 42, newEmail: "a@example.com" },
      60,
      SECRET,
    );
    const payload = verifySignedToken<Payload>(token, SECRET);
    expect(payload?.userId).toBe(42);
    expect(payload?.newEmail).toBe("a@example.com");
  });

  test("rejects an expired token", () => {
    const token = createSignedToken<Payload>(
      { userId: 1, newEmail: "b@example.com" },
      -1,
      SECRET,
    );
    expect(verifySignedToken<Payload>(token, SECRET)).toBeNull();
  });

  test("rejects a tampered token", () => {
    const token = createSignedToken<Payload>(
      { userId: 1, newEmail: "c@example.com" },
      60,
      SECRET,
    );
    const [body, sig] = token.split(".");
    const tampered = `${body}x.${sig}`;
    expect(verifySignedToken<Payload>(tampered, SECRET)).toBeNull();
  });

  test("rejects a token signed with a different secret", () => {
    const token = createSignedToken<Payload>(
      { userId: 1, newEmail: "d@example.com" },
      60,
      SECRET,
    );
    expect(verifySignedToken<Payload>(token, "different-secret")).toBeNull();
  });

  test("rejects garbage input", () => {
    expect(verifySignedToken("not-a-token", SECRET)).toBeNull();
    expect(verifySignedToken("", SECRET)).toBeNull();
  });
});
