import { describe, expect, test } from "bun:test";
import {
  COMMUNITY_LINKS,
  DISCORD_URL,
  FACEBOOK_URL,
  INSTAGRAM_URL,
  MESSENGER_CONTRIBUTE_TARGET,
  MESSENGER_CONTRIBUTE_URL,
  MESSENGER_MAINTAIN_TARGET,
  MESSENGER_MAINTAIN_URL,
  MESSENGER_SHORT_CONTRIBUTE_URL,
  MESSENGER_URL,
} from "./community-links.ts";

describe("community-links", () => {
  test("volunteer Messenger defaults to contribute short link", () => {
    expect(MESSENGER_URL).toBe(MESSENGER_CONTRIBUTE_URL);
    expect(MESSENGER_CONTRIBUTE_URL).toBe(
      "https://room-tba.uplb.tools/messenger/contribute",
    );
    expect(MESSENGER_MAINTAIN_URL).toBe(
      "https://room-tba.uplb.tools/messenger/maintain",
    );
    expect(MESSENGER_SHORT_CONTRIBUTE_URL).toBe(
      "https://messenger.uplbtools.me/contribute",
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
  test("UPLB Tools socials are listed for the footer", () => {
    expect(FACEBOOK_URL).toBe("https://facebook.com/uplb.tools");
    expect(INSTAGRAM_URL).toBe("https://instagram.com/uplb.tools");
    const labels = COMMUNITY_LINKS.map((link) => link.label);
    expect(labels).toContain("Facebook");
    expect(labels).toContain("Instagram");
  });
});
