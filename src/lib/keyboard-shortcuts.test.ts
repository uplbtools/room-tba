import { describe, expect, test } from "bun:test";
import {
  getGlobalShortcutAction,
  getKeyboardShortcutGroups,
  isApplePlatform,
  isTypingTarget,
} from "./keyboard-shortcuts";

function mockElement(
  tagName: string,
  options?: { isContentEditable?: boolean },
): HTMLElement {
  return {
    tagName: tagName.toUpperCase(),
    isContentEditable: options?.isContentEditable ?? false,
  } as HTMLElement;
}

describe("isTypingTarget", () => {
  test("detects form fields", () => {
    expect(isTypingTarget(mockElement("input"))).toBe(true);
    expect(isTypingTarget(mockElement("textarea"))).toBe(true);
    expect(isTypingTarget(mockElement("button"))).toBe(false);
  });
});

describe("getGlobalShortcutAction", () => {
  test("focus search with slash outside inputs", () => {
    expect(
      getGlobalShortcutAction({
        key: "/",
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        target: mockElement("body"),
      }),
    ).toBe("focus-search");
  });

  test("ignores slash while typing in input", () => {
    expect(
      getGlobalShortcutAction({
        key: "/",
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        target: mockElement("input"),
      }),
    ).toBeNull();
  });

  test("opens shortcuts help with question mark", () => {
    expect(
      getGlobalShortcutAction({
        key: "?",
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        target: mockElement("body"),
      }),
    ).toBe("open-shortcuts-help");
  });

  test("opens term picker with T", () => {
    expect(
      getGlobalShortcutAction({
        key: "t",
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        target: mockElement("body"),
      }),
    ).toBe("open-term-picker");
  });
});

describe("shortcut help content", () => {
  test("detects Apple platforms from platform, client hints, or UA", () => {
    expect(isApplePlatform({ platform: "MacIntel", userAgent: "" })).toBe(true);
    expect(
      isApplePlatform({
        platform: "",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      }),
    ).toBe(true);
    expect(
      isApplePlatform({
        platform: "Linux x86_64",
        userAgent: "",
        userAgentData: { platform: "macOS" },
      }),
    ).toBe(true);
    expect(
      isApplePlatform({ platform: "Win32", userAgent: "Windows NT" }),
    ).toBe(false);
  });

  test("the help sheet does not list the key that opened it", () => {
    const keys = getKeyboardShortcutGroups().flatMap((group) =>
      group.items.flatMap((item) => [...item.keys]),
    );
    expect(keys).not.toContain("?");
  });
});
