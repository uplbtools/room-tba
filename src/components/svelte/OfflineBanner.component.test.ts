import { fireEvent, render, screen } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, describe, expect, test } from "vitest";
import OfflineBanner from "./OfflineBanner.svelte";
import { onlineStatus } from "@lib/stores/online-status.svelte";

describe("OfflineBanner", () => {
  afterEach(() => {
    onlineStatus.online = true;
  });

  test("stays hidden while online", () => {
    onlineStatus.online = true;
    render(OfflineBanner);
    expect(screen.queryByText(/You’re offline/)).toBeNull();
  });

  test("shows whenever the device is offline, including at mount", () => {
    onlineStatus.online = false;
    render(OfflineBanner);
    expect(screen.getByRole("status")).toHaveTextContent(
      "You’re offline — showing saved data",
    );
  });

  test("dismisses, then comes back the next time the connection drops", async () => {
    onlineStatus.online = false;
    render(OfflineBanner);

    await fireEvent.click(
      screen.getByRole("button", { name: "Dismiss offline notice" }),
    );
    expect(screen.queryByText(/You’re offline/)).toBeNull();

    onlineStatus.online = true;
    flushSync();
    onlineStatus.online = false;
    flushSync();
    expect(screen.getByText(/You’re offline/)).toBeVisible();
  });
});
