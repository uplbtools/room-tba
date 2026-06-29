import {
  LEGAL_LINKS,
  UPLB_TOOLS_URL,
  DISCORD_URL,
  MESSENGER_URL,
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
  id: "contributors" | "editor-login" | "browse-classes";
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
      href: MESSENGER_URL,
      external: true,
      icon: "messenger",
    },
  ],
};

/** In-app actions (rendered via StatusBar action handler). */
export const STATUS_BAR_APP_ACTIONS: StatusBarActionItem[] = [
  { kind: "action", id: "browse-classes", label: "Browse classes" },
  { kind: "action", id: "contributors", label: "Contributors" },
  { kind: "action", id: "editor-login", label: "Editor sign in" },
];

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
  const appItems: StatusBarNavItem[] = [
    STATUS_BAR_APP_ACTIONS[0]!,
    STATUS_BAR_APP_ACTIONS[1]!,
    ...(options.showEditorLogin ? [STATUS_BAR_APP_ACTIONS[2]!] : []),
  ];

  return [
    STATUS_BAR_COMMUNITY_GROUP,
    { id: "app", items: appItems },
    buildStatusBarMetaGroup(options.versionLabel),
  ];
}
