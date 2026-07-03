/** External UPLB Tools community and org links (also wired as short redirects in astro.config). */

export const UPLB_TOOLS_URL = "https://uplbtools.me";
export const DISCORD_URL = "https://discord.uplbtools.me";

/** Facebook Messenger group chat invites (targets for messenger.uplbtools.me redirects). */
export const MESSENGER_CONTRIBUTE_TARGET = "https://m.me/j/Aba1V0prvQyLrafZ/";
export const MESSENGER_MAINTAIN_TARGET = "https://m.me/j/AbZtqMU8UUTiwQfn/";

/** Canonical short URLs (volunteers / maintainers). Host should redirect to *_TARGET. */
export const MESSENGER_CONTRIBUTE_URL =
  "https://messenger.uplbtools.me/contribute";
export const MESSENGER_MAINTAIN_URL = "https://messenger.uplbtools.me/maintain";

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
