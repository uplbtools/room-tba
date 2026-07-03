/** External UPLB Tools community and org links (also wired as short redirects in astro.config). */

/** Canonical production origin — literal so astro.config can import this module. */
const ROOM_TBA_SITE_URL = "https://room-tba.uplbtools.me";

export const UPLB_TOOLS_URL = "https://uplbtools.me";
export const DISCORD_URL = "https://discord.uplbtools.me";

/** Facebook Messenger group chat invites (targets for redirect workers). */
export const MESSENGER_CONTRIBUTE_TARGET = "https://m.me/j/Aba1V0prvQyLrafZ/";
export const MESSENGER_MAINTAIN_TARGET = "https://m.me/j/AbZtqMU8UUTiwQfn/";

/** Short links on messenger.uplbtools.me (Cloudflare Worker). */
export const MESSENGER_SHORT_CONTRIBUTE_URL =
  "https://messenger.uplbtools.me/contribute";
export const MESSENGER_SHORT_MAINTAIN_URL =
  "https://messenger.uplbtools.me/maintain";

/** App-stable redirect URLs on room-tba (avoids messenger subdomain DNS cache misses). */
export const MESSENGER_CONTRIBUTE_URL = `${ROOM_TBA_SITE_URL}/messenger/contribute`;
export const MESSENGER_MAINTAIN_URL = `${ROOM_TBA_SITE_URL}/messenger/maintain`;

/** Default volunteer-facing Messenger entry. */
export const MESSENGER_URL = MESSENGER_CONTRIBUTE_URL;

export const COMMUNITY_LINKS = [
  { label: "UPLB Tools", href: UPLB_TOOLS_URL },
  { label: "Discord", href: DISCORD_URL },
  { label: "Messenger", href: MESSENGER_CONTRIBUTE_URL },
] as const;

export const LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;
