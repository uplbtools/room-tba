import { describe, expect, test } from "bun:test";
import {
  DISCORD_URL,
  MESSENGER_CONTRIBUTE_TARGET,
  MESSENGER_CONTRIBUTE_URL,
  MESSENGER_MAINTAIN_TARGET,
  MESSENGER_MAINTAIN_URL,
  MESSENGER_URL,
} from "./community-links.ts";

describe("community-links", () => {
  test("volunteer Messenger defaults to contribute short link", () => {
    expect(MESSENGER_URL).toBe(MESSENGER_CONTRIBUTE_URL);
    expect(MESSENGER_CONTRIBUTE_URL).toBe(
      "https://messenger.uplbtools.me/contribute",
    );
    expect(MESSENGER_MAINTAIN_URL).toBe(
      "https://messenger.uplbtools.me/maintain",
    );
  });

  test("Messenger targets are m.me group invites", () => {
    expect(MESSENGER_CONTRIBUTE_TARGET).toMatch(/^https:\/\/m\.me\//);
    expect(MESSENGER_MAINTAIN_TARGET).toMatch(/^https:\/\/m\.me\//);
    expect(MESSENGER_CONTRIBUTE_TARGET).not.toBe(MESSENGER_MAINTAIN_TARGET);
  });

  test("Discord short link unchanged", () => {
    expect(DISCORD_URL).toBe("https://discord.uplbtools.me");
  });
});
