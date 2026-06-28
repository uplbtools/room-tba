/** External UPLB Tools community and org links (also wired as short redirects in astro.config). */

export const UPLB_TOOLS_URL = "https://uplbtools.me";
export const DISCORD_URL = "https://discord.uplbtools.me";
export const MESSENGER_URL = "https://messenger.uplbtools.me";

export const COMMUNITY_LINKS = [
  { label: "UPLB Tools", href: UPLB_TOOLS_URL },
  { label: "Discord", href: DISCORD_URL },
  { label: "Messenger", href: MESSENGER_URL },
] as const;

export const LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;
