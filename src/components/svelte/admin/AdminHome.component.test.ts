import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, test, vi } from "vitest";
import AdminHome from "./AdminHome.svelte";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";

const DASHBOARD = {
  pendingReviews: 4,
  recentActivity: [
    {
      id: 1,
      entityType: "room",
      action: "update",
      editedBy: "Stimmie",
      summary: "Updated CEM 203",
      createdAt: "2026-10-08 01:00:00",
    },
  ],
  digest: {
    lastRuns: [
      {
        period: "2026-10-08",
        status: "done",
        detail: { recipientCount: 3, failedCount: 0, skipped: null },
        finishedAt: "2026-10-08 00:00:05",
      },
    ],
    recipientCount: 3,
    youReceiveIt: true,
  },
  email: {
    sent7d: 10,
    failed7d: 1,
    recentFailures: [
      {
        id: 9,
        toAddress: "x@example.ph",
        template: "password-reset",
        error: "Resend API error 500",
        createdAt: "2026-10-07 10:00:00",
      },
    ],
  },
  outbox: { pending: 0, dead: 0 },
  mfa: { available: true, enabled: false, required: true, graceUntil: null },
  accessRequests: [
    {
      id: 3,
      username: "newbie",
      displayName: "Newbie",
      message: "I map the CAS rooms.",
      createdAt: "2026-10-07 09:00:00",
    },
  ],
};

function stub(handler: (url: string, init?: RequestInit) => Response) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("AdminHome (auth audit item 15)", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("signed out: roles explained and a sign-in link", () => {
    render(AdminHome, { viewer: null });
    expect(screen.getByText("Who can do what")).toBeVisible();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/?editor=login",
    );
  });

  test("contributor: sends an in-app editor access request", async () => {
    const fn = stub((_url, init) => {
      if (init?.method === "POST") {
        return new Response(
          JSON.stringify({
            request: {
              id: 1,
              status: "pending",
              message: "x",
              createdAt: "2026-10-08 00:00:00",
            },
          }),
          { status: 201 },
        );
      }
      return new Response(JSON.stringify({ request: null }));
    });
    render(AdminHome, {
      viewer: { username: "jane", displayName: "Jane", role: "contributor" },
    });
    const box = await screen.findByLabelText("What would you like to edit?");
    await fireEvent.input(box, {
      target: { value: "Rooms in the CEM building" },
    });
    await fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    await waitFor(() => expect(screen.getByText(/Request sent/)).toBeVisible());
    const post = fn.mock.calls.find(([, init]) => init?.method === "POST");
    expect(post?.[0]).toBe("/api/account/access-request");
  });

  test("admin: dashboard with queue, digest, email failures, requests and audit log", async () => {
    mountAtWidth(360);
    stub((url) =>
      url.startsWith("/api/admin/audit-log")
        ? new Response(
            JSON.stringify({
              entries: [
                {
                  id: 1,
                  actorLabel: "stimmie",
                  action: "user.role_changed",
                  targetLabel: "yeyel",
                  detail: { from: "editor", to: "admin" },
                  ip: null,
                  createdAt: "2026-10-08 00:00:00",
                },
              ],
              nextBefore: null,
            }),
          )
        : new Response(JSON.stringify(DASHBOARD)),
    );
    const { container } = render(AdminHome, {
      viewer: { username: "stimmie", displayName: "Stimmie", role: "admin" },
    });
    expect(await screen.findByTestId("pending-reviews")).toHaveTextContent("4");
    expect(
      screen.getByRole("link", { name: "Open review queue" }),
    ).toHaveAttribute("href", "/?review=1");
    expect(screen.getByText(/sent to 3/)).toBeVisible();
    expect(screen.getByText(/Resend API error 500/)).toBeVisible();
    expect(screen.getByText("I map the CAS rooms.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Manage users" })).toHaveAttribute(
      "href",
      "/?manage=users",
    );
    expect(await screen.findByText("Role changed")).toBeVisible();
    expect(screen.getByText("editor to admin")).toBeVisible();
    expect(screen.getByText("Two-step verification")).toBeVisible();
    expectNoHorizontalOverflow(container.firstElementChild as HTMLElement);
  });
});
