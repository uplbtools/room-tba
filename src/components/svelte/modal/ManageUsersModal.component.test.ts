import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ManageUsersModal from "./ManageUsersModal.svelte";
import { adminAuthStore } from "@lib/store.svelte";

const USERS = [
  {
    id: 1,
    username: "stimmie",
    displayName: "Stimmie",
    email: "s@example.ph",
    role: "admin",
    isActive: true,
  },
  {
    id: 2,
    username: "yeyel",
    displayName: "Yeyel",
    email: null,
    role: "editor",
    isActive: true,
  },
];

describe("ManageUsersModal (auth audit items 18 and 19)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/admin/users" && !init?.method) {
        return new Response(
          JSON.stringify({
            users: USERS,
            invites: [
              {
                id: 5,
                email: "new@example.ph",
                role: "editor",
                expiresAt: "2026-10-15 00:00:00",
              },
            ],
          }),
        );
      }
      if (url.startsWith("/api/admin/users/2") && init?.method === "PATCH") {
        return new Response(JSON.stringify({ success: true }));
      }
      if (url === "/api/admin/users/invite" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            success: true,
            emailed: false,
            inviteUrl: "https://x/invite?token=t",
          }),
          { status: 201 },
        );
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    adminAuthStore.manageUsersOpen = true;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    adminAuthStore.manageUsersOpen = false;
  });

  const patchCalls = () =>
    fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit)?.method === "PATCH",
    );

  test("promoting to admin asks first and only saves on confirm", async () => {
    render(ManageUsersModal);
    const select = await screen.findByLabelText("Role for Yeyel");
    await fireEvent.change(select, { target: { value: "admin" } });

    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(screen.getByText("Make Yeyel an admin?")).toBeVisible();
    expect(patchCalls()).toHaveLength(0);

    await fireEvent.click(screen.getByRole("button", { name: "Make admin" }));
    await waitFor(() => expect(patchCalls()).toHaveLength(1));
    expect(
      JSON.parse(String((patchCalls()[0]?.[1] as RequestInit).body)),
    ).toEqual({
      role: "admin",
    });
  });

  test("cancel leaves the role unchanged and the select reset", async () => {
    render(ManageUsersModal);
    const select = (await screen.findByLabelText(
      "Role for Yeyel",
    )) as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: "contributor" } });
    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(patchCalls()).toHaveLength(0);
    expect(
      (screen.getByLabelText("Role for Yeyel") as HTMLSelectElement).value,
    ).toBe("editor");
  });

  test("new staff are invited by email, with no temporary password field", async () => {
    render(ManageUsersModal);
    expect(await screen.findByText("new@example.ph")).toBeVisible();
    await fireEvent.click(
      screen.getByRole("button", { name: "Invite admin / editor" }),
    );
    expect(screen.queryByLabelText(/Temporary password/i)).toBeNull();
    await fireEvent.input(screen.getByLabelText("Email"), {
      target: { value: "friend@example.ph" },
    });
    await fireEvent.click(screen.getByRole("button", { name: "Send invite" }));
    // Email not sent: the link is handed to the admin instead.
    expect(await screen.findByLabelText("Invite link")).toHaveValue(
      "https://x/invite?token=t",
    );
  });
});
