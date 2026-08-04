import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import FollowPrompt from "./FollowPrompt.svelte";
import { FOLLOW_PROMPT_KEY } from "@lib/social-follow";

const note = "Fixes and new features get posted on Facebook and Instagram.";

const dismiss = () =>
  screen.getByRole("button", { name: /dismiss follow suggestion/i });

describe("FollowPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("asks once, with real outbound links to both accounts", () => {
    render(FollowPrompt, { props: { note } });

    expect(screen.getByText(note)).toBeVisible();

    for (const name of [/facebook/i, /instagram/i]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      // Both tokens matter: noreferrer alone still leaks window.opener on old
      // browsers, and noopener alone still sends the referrer.
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link.getAttribute("href")).toMatch(/^https:\/\//);
    }
  });

  test("dismissal persists and is respected on the next mount", async () => {
    const first = render(FollowPrompt, { props: { note } });
    await fireEvent.click(dismiss());

    expect(screen.queryByText(note)).toBe(null);
    expect(localStorage.getItem(FOLLOW_PROMPT_KEY)).toBe("dismissed");

    // A fresh mount is the next visit: the ask must not come back.
    first.unmount();
    render(FollowPrompt, { props: { note } });
    expect(screen.queryByText(note)).toBe(null);
    expect(screen.queryByRole("link", { name: /facebook/i })).toBe(null);
  });

  test("following also retires the prompt, so nobody is asked twice", async () => {
    const first = render(FollowPrompt, { props: { note } });
    await fireEvent.click(screen.getByRole("link", { name: /instagram/i }));

    expect(localStorage.getItem(FOLLOW_PROMPT_KEY)).toBe("followed");

    first.unmount();
    render(FollowPrompt, { props: { note } });
    expect(screen.queryByText(note)).toBe(null);
  });

  // Without a cap, a reader who neither dismisses nor follows sees this on
  // every visit forever. For someone who looks up a room most days that is a
  // nag, which is the one thing this was not allowed to be.
  test("retires itself after three unanswered showings", () => {
    for (let visit = 1; visit <= 3; visit += 1) {
      const { unmount } = render(FollowPrompt, { props: { note } });
      expect(
        screen.queryByRole("button", { name: /dismiss follow suggestion/i }),
        `visit ${visit} should still ask`,
      ).not.toBe(null);
      unmount();
    }

    render(FollowPrompt, { props: { note } });
    expect(
      screen.queryByRole("button", { name: /dismiss follow suggestion/i }),
      "fourth visit must not ask again",
    ).toBe(null);
    expect(localStorage.getItem(FOLLOW_PROMPT_KEY)).toBe("ignored");
  });

  test("a dismissal written by an earlier visit hides it before first paint", () => {
    localStorage.setItem(FOLLOW_PROMPT_KEY, "dismissed");
    render(FollowPrompt, { props: { note } });

    expect(screen.queryByText(note)).toBe(null);
    expect(screen.queryByRole("button", { name: /dismiss/i })).toBe(null);
  });

  test("unreadable storage shows the ask rather than swallowing it", () => {
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("storage blocked");
    };
    try {
      render(FollowPrompt, { props: { note } });
      expect(screen.getByText(note)).toBeVisible();
    } finally {
      Storage.prototype.getItem = getItem;
    }
  });
});
