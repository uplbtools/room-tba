import {
  LEGAL_LINKS,
  MESSENGER_CONTRIBUTE_TARGET,
  UPLB_TOOLS_URL,
  DISCORD_URL,
} from "@constants/community-links";

/** Icon keys resolved in StatusBarLinkGroup — add new icons there when extending. */
export type StatusBarIcon = "external" | "discord" | "messenger";

export type StatusBarLinkItem = {
  kind: "link";
  id: string;
  label: string;
  href: string;
  external?: boolean;
  icon?: StatusBarIcon;
};

export type StatusBarActionItem = {
  kind: "action";
  id: "contributors" | "leaderboard";
  label: string;
};

export type StatusBarNavItem = StatusBarLinkItem | StatusBarActionItem;

export type StatusBarNavGroup = {
  id: string;
  /** Optional sub-heading shown above the group's rows. */
  label?: string;
  items: StatusBarNavItem[];
};

/** Primary community + org links (external). */
export const STATUS_BAR_COMMUNITY_GROUP: StatusBarNavGroup = {
  id: "community",
  items: [
    {
      kind: "link",
      id: "uplb-tools",
      label: "UPLB Tools",
      href: UPLB_TOOLS_URL,
      external: true,
      icon: "external",
    },
    {
      kind: "link",
      id: "discord",
      label: "Discord",
      href: DISCORD_URL,
      external: true,
      icon: "discord",
    },
    {
      kind: "link",
      id: "messenger",
      label: "Messenger",
      href: MESSENGER_CONTRIBUTE_TARGET,
      external: true,
      icon: "messenger",
    },
  ],
};

/** In-app actions (rendered via the App menu's action handler). Sign in and
    sign up are not here: the menu header carries the one sign-in row, and
    the sign-in dialog has its own "Sign up" toggle. */
export const STATUS_BAR_APP_ACTIONS: StatusBarActionItem[] = [
  { kind: "action", id: "contributors", label: "Contributors" },
  { kind: "action", id: "leaderboard", label: "Leaderboard" },
];

/** Similar campus map initiatives (#108). */
export const STATUS_BAR_SIMILAR_PROJECTS_GROUP: StatusBarNavGroup = {
  id: "similar",
  label: "Similar maps",
  items: [
    {
      kind: "link",
      id: "malayo-ba-yan",
      label: "Malayo Ba 'Yan?",
      href: "https://umap.openstreetmap.fr/en/map/ati-ntc-rh-malayo-ba-yan-maps-and-directions_1245231",
      external: true,
      icon: "external",
    },
    {
      kind: "link",
      id: "uplb-lower-campus",
      label: "UPLB Lower Campus",
      href: "https://umap.openstreetmap.fr/en/map/uplb-lower-campus_1180826",
      external: true,
      icon: "external",
    },
    {
      kind: "link",
      id: "uplb-scribblemaps",
      label: "UPLB ScribbleMaps",
      href: "https://www.scribblemaps.com/maps/view/UPLB-Map/8fmzCgyQ4y",
      external: true,
      icon: "external",
    },
  ],
};

/** Legal links for the menu footer. FAQ is left out: "Help & FAQ" is a row. */
export const STATUS_BAR_LEGAL_LINKS = LEGAL_LINKS.filter(
  (link) => link.href !== "/faq",
);

/** Groups shown as rows in the App menu (order matters). The release version
    is not linked here: "What's new" opens the same changelog. */
export function statusBarNavGroups(): StatusBarNavGroup[] {
  return [
    {
      id: "community",
      items: [...STATUS_BAR_APP_ACTIONS, ...STATUS_BAR_COMMUNITY_GROUP.items],
    },
    STATUS_BAR_SIMILAR_PROJECTS_GROUP,
  ];
}
