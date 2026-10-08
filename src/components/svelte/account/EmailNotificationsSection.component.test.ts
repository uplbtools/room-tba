import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, test, vi } from "vitest";
import EmailNotificationsSection from "./EmailNotificationsSection.svelte";

describe("EmailNotificationsSection (auth audit item 20)", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stub() {
    const fn = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        const body = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({ digest: true, reviewNotices: true, ...body }),
        );
      }
      return new Response(
        JSON.stringify({ digest: true, reviewNotices: true }),
      );
    });
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  test("staff see both switches; toggling saves immediately", async () => {
    const fn = stub();
    render(EmailNotificationsSection, { isStaff: true });
    const digest = await screen.findByRole("switch", {
      name: "Daily review digest",
    });
    await waitFor(() => expect(digest).toHaveAttribute("aria-checked", "true"));
    await fireEvent.click(digest);
    await waitFor(() =>
      expect(digest).toHaveAttribute("aria-checked", "false"),
    );
    const patch = fn.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ digest: false });
  });

  test("contributors only get review notices", async () => {
    stub();
    render(EmailNotificationsSection, { isStaff: false });
    expect(
      await screen.findByRole("switch", { name: "Review notices" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("switch", { name: "Daily review digest" }),
    ).toBeNull();
  });
});
