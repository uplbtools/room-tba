import { focusSearch } from "./search-focus";

export type GlobalShortcutAction =
  "focus-search" | "open-shortcuts-help" | "open-term-picker";

export function isTypingTarget(target: EventTarget | null) {
  if (!target || typeof target !== "object") return false;
  if (!("tagName" in target) || typeof target.tagName !== "string") {
    return false;
  }
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return "isContentEditable" in target && target.isContentEditable === true;
}

export function modifierLabel() {
  if (typeof navigator === "undefined") return "Ctrl";
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘" : "Ctrl";
}

export function getGlobalShortcutAction(
  event: Pick<
    KeyboardEvent,
    "key" | "ctrlKey" | "metaKey" | "altKey" | "target"
  >,
): GlobalShortcutAction | null {
  if (event.altKey) return null;

  const key = event.key;
  const mod = event.ctrlKey || event.metaKey;

  if (mod && key.toLowerCase() === "k") {
    return "focus-search";
  }

  if (isTypingTarget(event.target)) return null;

  if (key === "/") return "focus-search";
  if (key === "?") return "open-shortcuts-help";
  if (key.toLowerCase() === "t") return "open-term-picker";

  return null;
}

export function dispatchGlobalShortcut(action: GlobalShortcutAction) {
  switch (action) {
    case "focus-search":
      focusSearch();
      return;
    case "open-shortcuts-help":
      openShortcutsHelp();
      return;
    case "open-term-picker":
      window.dispatchEvent(new CustomEvent("room-tba:open-term-picker"));
      return;
  }
}

export function openShortcutsHelp() {
  window.dispatchEvent(new CustomEvent("room-tba:open-shortcuts-help"));
}

export function getKeyboardShortcutGroups() {
  const mod = modifierLabel();
  return [
    {
      title: "Search & browse",
      items: [
        { keys: ["/", `${mod}+K`], description: "Focus search" },
        { keys: ["Escape"], description: "Dismiss overlay or clear search" },
        { keys: ["T"], description: "Open term picker" },
      ],
    },
    {
      title: "Map edit",
      items: [
        {
          keys: [`${mod}+Z`, `${mod}+Shift+Z`],
          description: "Undo / redo pin drag (edit mode)",
        },
      ],
    },
    {
      title: "Help",
      items: [{ keys: ["?"], description: "Keyboard shortcuts" }],
    },
  ] as const;
}
