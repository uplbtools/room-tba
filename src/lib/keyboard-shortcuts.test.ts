import { describe, expect, test } from "bun:test";
import { getGlobalShortcutAction, isTypingTarget } from "./keyboard-shortcuts";

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
