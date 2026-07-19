/** External community and org links (also wired as short redirects in astro.config).
 *
 * Campus-specific values live in src/campus.config.ts — a fork edits that one
 * file. This module re-exports them under the names the rest of the app imports
 * and derives the app-stable redirect URLs from the site URL. */
import { campusCommunity, campusSite } from "../campus.config";

/** Canonical production origin. */
const ROOM_TBA_SITE_URL = campusSite.url;

export const UPLB_TOOLS_URL = campusCommunity.orgUrl;
export const GITHUB_ROOM_TBA_URL = campusCommunity.githubUrl;
export const DISCORD_URL = campusCommunity.discordUrl;
export const UPLB_OSA_ORGANIZATIONS_URL = campusCommunity.osaOrganizationsUrl;

/** Facebook Messenger group chat invites (targets for redirect workers). */
export const MESSENGER_CONTRIBUTE_TARGET =
  campusCommunity.messengerContributeTarget;
export const MESSENGER_MAINTAIN_TARGET =
  campusCommunity.messengerMaintainTarget;

/** Short links on a community subdomain (Cloudflare Worker). */
export const MESSENGER_SHORT_CONTRIBUTE_URL =
  campusCommunity.messengerShortContributeUrl;
export const MESSENGER_SHORT_MAINTAIN_URL =
  campusCommunity.messengerShortMaintainUrl;

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
