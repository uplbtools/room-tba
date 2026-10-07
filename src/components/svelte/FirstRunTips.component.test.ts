import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import FirstRunTips from "./FirstRunTips.svelte";

describe("FirstRunTips", () => {
  test("is a light, non-modal card with a few tips", () => {
    render(FirstRunTips, { ondismiss: vi.fn(), onguide: vi.fn() });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getAllByRole("listitem").length).toBeLessThanOrEqual(3);
  });

  test("Got it dismisses; How it works opens the full guide", async () => {
    const ondismiss = vi.fn();
    const onguide = vi.fn();
    render(FirstRunTips, { ondismiss, onguide });

    await fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(ondismiss).toHaveBeenCalledOnce();

    await fireEvent.click(screen.getByRole("button", { name: "How it works" }));
    expect(onguide).toHaveBeenCalledOnce();
  });
});
