import { describe, expect, mock, test } from "bun:test";
import {
  BREACHED_PASSWORD_MESSAGE,
  breachCountFromRange,
  checkNewPassword,
  pwnedPasswordCount,
  sha1Hex,
} from "./breached-password";

// SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
const PASSWORD_SUFFIX = "1E4C9B93F3F0682250B6CF8331B7EE68FD8";

function fakeFetch(body: string, ok = true) {
  return mock(
    async (_url: string | URL | Request) =>
      new Response(body, { status: ok ? 200 : 503 }),
  ) as unknown as typeof fetch & ReturnType<typeof mock>;
}

describe("breached password check", () => {
  test("sha1Hex is upper-case hex", () => {
    expect(sha1Hex("password")).toBe(`5BAA6${PASSWORD_SUFFIX}`);
  });

  test("finds the suffix count in a padded range body", () => {
    const body = `0018A45C4D1DEF81644B54AB7F969B88D65:0\r\n${PASSWORD_SUFFIX}:9545824\r\nFFFF:2`;
    expect(breachCountFromRange(body, PASSWORD_SUFFIX)).toBe(9545824);
    expect(breachCountFromRange(body, "ABCDEF")).toBe(0);
  });

  test("only the 5-character prefix leaves the server", async () => {
    const fetchImpl = fakeFetch(`${PASSWORD_SUFFIX}:3`);
    expect(await pwnedPasswordCount("password", fetchImpl)).toBe(3);
    const url = String(
      (fetchImpl as ReturnType<typeof mock>).mock.calls[0]?.[0],
    );
    expect(url).toBe("https://api.pwnedpasswords.com/range/5BAA6");
  });

  test("fails open on network errors and bad status", async () => {
    const throwing = mock(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await pwnedPasswordCount("password", throwing)).toBeNull();
    expect(
      await pwnedPasswordCount("password", fakeFetch("", false)),
    ).toBeNull();
    expect(await checkNewPassword("long enough password", throwing)).toBeNull();
  });

  test("checkNewPassword: length rules first, then the breach list", async () => {
    const hit = fakeFetch(`${sha1Hex("correct horse battery").slice(5)}:12`);
    expect(await checkNewPassword("short", hit)).toMatch(/at least 10/);
    expect(await checkNewPassword("é".repeat(40), hit)).toMatch(/72 bytes/);
    expect(await checkNewPassword("correct horse battery", hit)).toBe(
      BREACHED_PASSWORD_MESSAGE,
    );
    expect(
      await checkNewPassword("a never seen passphrase", fakeFetch("ABC:1")),
    ).toBeNull();
  });
});
