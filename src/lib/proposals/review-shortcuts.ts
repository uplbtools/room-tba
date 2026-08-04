import { isTypingTarget } from "@lib/keyboard-shortcuts";

/**
 * Single-key shortcuts for the approver queue (#873 follow-up). A long queue is
 * reviewed one row at a time, so the hands stay on the keyboard.
 *
 * These are bare keys, so they must never fire while the reviewer is writing a
 * reject / request-changes note. `isTypingTarget` is the same guard the global
 * shortcuts use for `/`, `?` and `t`.
 */

export type ReviewShortcutAction =
  | "approve"
  | "reject"
  | "next"
  | "previous"
  | "undo";

export const REVIEW_SHORTCUT_HINTS: ReadonlyArray<{
  keys: string;
  description: string;
}> = [
  { keys: "J / K", description: "Next / previous suggestion" },
  { keys: "A", description: "Approve" },
  { keys: "R", description: "Reject" },
  { keys: "U", description: "Undo last approve" },
];

export function getReviewShortcutAction(
  event: Pick<
    KeyboardEvent,
    "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey" | "target"
  >,
): ReviewShortcutAction | null {
  // Modified chords belong to the browser and the global shortcut table.
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  // Typing a note must never trigger a review action.
  if (isTypingTarget(event.target)) return null;

  switch (event.key.toLowerCase()) {
    case "j":
    case "arrowdown":
      return "next";
    case "k":
    case "arrowup":
      return "previous";
    case "a":
      return "approve";
    case "r":
      return "reject";
    case "u":
      return "undo";
    default:
      return null;
  }
}

/** Wrap index into range, so Next past the end returns to the first row. */
export function stepIndex(
  current: number | null,
  total: number,
  direction: 1 | -1,
): number | null {
  if (total <= 0) return null;
  if (current === null) return direction === 1 ? 0 : total - 1;
  return (current + direction + total) % total;
}
