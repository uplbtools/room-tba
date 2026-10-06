import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, test } from "vitest";
import { queryStore } from "@lib/store.svelte";
import KuboDormPrompt from "./KuboDormPrompt.svelte";

describe("KuboDormPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    queryStore.clearQuery();
  });

  test("can be dismissed permanently", async () => {
    const { container } = render(KuboDormPrompt);
    await tick();
    expect(screen.getByRole("link", { name: "Browse Kubo" })).toHaveAttribute(
      "href",
      "https://kubo.community",
    );

    screen.getByRole("button", { name: /dismiss kubo dorm prompt/i }).click();
    await tick();
    expect(container.querySelector(".kubo-dorm-prompt")).toBeNull();
    expect(localStorage.getItem("room-tba:kubo-dorm-prompt-dismissed")).toBe(
      "1",
    );
  });
});
