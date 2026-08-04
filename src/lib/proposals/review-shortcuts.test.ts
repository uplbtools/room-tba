import { describe, expect, test } from "bun:test";
import { getReviewShortcutAction, stepIndex } from "./review-shortcuts";

function keyEvent(
  key: string,
  overrides: Partial<{
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    target: EventTarget | null;
  }> = {},
) {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    target: { tagName: "DIV" } as unknown as EventTarget,
    ...overrides,
  };
}

describe("getReviewShortcutAction", () => {
  test("maps the queue keys", () => {
    expect(getReviewShortcutAction(keyEvent("j"))).toBe("next");
    expect(getReviewShortcutAction(keyEvent("k"))).toBe("previous");
    expect(getReviewShortcutAction(keyEvent("ArrowDown"))).toBe("next");
    expect(getReviewShortcutAction(keyEvent("ArrowUp"))).toBe("previous");
    expect(getReviewShortcutAction(keyEvent("a"))).toBe("approve");
    expect(getReviewShortcutAction(keyEvent("r"))).toBe("reject");
    expect(getReviewShortcutAction(keyEvent("u"))).toBe("undo");
  });

  test("is case insensitive", () => {
    expect(getReviewShortcutAction(keyEvent("A"))).toBe("approve");
    expect(getReviewShortcutAction(keyEvent("R"))).toBe("reject");
  });

  test("ignores unmapped keys", () => {
    expect(getReviewShortcutAction(keyEvent("z"))).toBeNull();
    expect(getReviewShortcutAction(keyEvent("Enter"))).toBeNull();
  });

  // The whole point of the typing guard: writing "a reject note" must not
  // approve a proposal on the letter "a".
  test("never fires while typing a note", () => {
    for (const tagName of ["TEXTAREA", "INPUT", "SELECT"]) {
      const target = { tagName } as unknown as EventTarget;
      expect(getReviewShortcutAction(keyEvent("a", { target }))).toBeNull();
      expect(getReviewShortcutAction(keyEvent("r", { target }))).toBeNull();
      expect(getReviewShortcutAction(keyEvent("j", { target }))).toBeNull();
    }
  });

  test("never fires in a contenteditable", () => {
    const target = {
      tagName: "DIV",
      isContentEditable: true,
    } as unknown as EventTarget;
    expect(getReviewShortcutAction(keyEvent("a", { target }))).toBeNull();
  });

  test("leaves modified chords to the browser", () => {
    expect(
      getReviewShortcutAction(keyEvent("a", { metaKey: true })),
    ).toBeNull();
    expect(
      getReviewShortcutAction(keyEvent("a", { ctrlKey: true })),
    ).toBeNull();
    expect(getReviewShortcutAction(keyEvent("r", { altKey: true }))).toBeNull();
  });
});

describe("stepIndex", () => {
  test("starts at the ends when nothing is focused", () => {
    expect(stepIndex(null, 3, 1)).toBe(0);
    expect(stepIndex(null, 3, -1)).toBe(2);
  });

  test("steps and wraps", () => {
    expect(stepIndex(0, 3, 1)).toBe(1);
    expect(stepIndex(2, 3, 1)).toBe(0);
    expect(stepIndex(0, 3, -1)).toBe(2);
  });

  test("has nothing to focus in an empty queue", () => {
    expect(stepIndex(null, 0, 1)).toBeNull();
    expect(stepIndex(0, 0, -1)).toBeNull();
  });
});
