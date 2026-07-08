import {
  LEGAL_LINKS,
  MESSENGER_CONTRIBUTE_TARGET,
  MESSENGER_MAINTAIN_TARGET,
  UPLB_TOOLS_URL,
  DISCORD_URL,
} from "@constants/community-links";

/** Icon keys resolved in StatusBarLinkGroup — add new icons there when extending. */
export type StatusBarIcon = "external" | "discord" | "messenger" | "version";

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
  id: "contributors" | "editor-login" | "leaderboard";
  label: string;
};

export type StatusBarNavItem = StatusBarLinkItem | StatusBarActionItem;

export type StatusBarNavGroup = {
  id: string;
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

/** In-app actions (rendered via StatusBar action handler). */
export const STATUS_BAR_APP_ACTIONS: StatusBarActionItem[] = [
  { kind: "action", id: "contributors", label: "Contributors" },
  { kind: "action", id: "leaderboard", label: "Leaderboard" },
  { kind: "action", id: "editor-login", label: "Editor sign in" },
];

/** Similar campus map initiatives (#108). */
export const STATUS_BAR_SIMILAR_PROJECTS_GROUP: StatusBarNavGroup = {
  id: "similar",
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

/** Legal + release metadata links. */
export function buildStatusBarMetaGroup(
  versionLabel: string,
): StatusBarNavGroup {
  return {
    id: "meta",
    items: [
      ...LEGAL_LINKS.map((link) => ({
        kind: "link" as const,
        id: link.href,
        label: link.label,
        href: link.href,
      })),
      {
        kind: "link",
        id: "changelog",
        label: versionLabel,
        href: "/changelog",
        icon: "version",
      },
    ],
  };
}

/** Groups shown in the expanded status panel (order matters). */
export function statusBarNavGroups(options: {
  versionLabel: string;
  showEditorLogin: boolean;
}): StatusBarNavGroup[] {
  const action = (id: StatusBarActionItem["id"]) =>
    STATUS_BAR_APP_ACTIONS.find((a) => a.id === id)!;
  const appItems: StatusBarNavItem[] = [
    action("contributors"),
    action("leaderboard"),
    ...(options.showEditorLogin
      ? [
          action("editor-login"),
          {
            kind: "link" as const,
            id: "messenger-maintain",
            label: "Maintainer chat",
            href: MESSENGER_MAINTAIN_TARGET,
            external: true,
            icon: "messenger" as const,
          },
        ]
      : []),
  ];

  return [
    STATUS_BAR_COMMUNITY_GROUP,
    STATUS_BAR_SIMILAR_PROJECTS_GROUP,
    { id: "app", items: appItems },
    buildStatusBarMetaGroup(options.versionLabel),
  ];
}
