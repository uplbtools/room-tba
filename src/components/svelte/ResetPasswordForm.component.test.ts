import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, test, vi } from "vitest";
import ResetPasswordForm from "./ResetPasswordForm.svelte";

describe("ResetPasswordForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("missing token explains how to get a new link", () => {
    render(ResetPasswordForm, { token: null, tokenState: "missing" });
    expect(screen.getByText(/missing its token/i)).toBeTruthy();
    expect(screen.queryByLabelText("New password")).toBeNull();
  });

  test("invalid token shows the expired error, no form", () => {
    render(ResetPasswordForm, { token: null, tokenState: "invalid" });
    expect(screen.getByText(/invalid or has expired/i)).toBeTruthy();
    expect(screen.queryByLabelText("New password")).toBeNull();
  });

  test("submit stays disabled until both fields match", async () => {
    render(ResetPasswordForm, { token: "t.sig", tokenState: "ok" });
    const submit = screen.getByRole("button", { name: /set new password/i });
    const pw = screen.getByLabelText("New password");
    const confirm = screen.getByLabelText("Confirm new password");
    await fireEvent.input(pw, { target: { value: "long-enough-pass" } });
    await fireEvent.input(confirm, { target: { value: "long-enough-pas" } });
    expect(screen.getByText("Passwords do not match.")).toBeTruthy();
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.input(confirm, { target: { value: "long-enough-pass" } });
    expect(screen.queryByText("Passwords do not match.")).toBeNull();
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });

  test("show password toggles both inputs", async () => {
    render(ResetPasswordForm, { token: "t.sig", tokenState: "ok" });
    const pw = screen.getByLabelText("New password") as HTMLInputElement;
    const confirm = screen.getByLabelText(
      "Confirm new password",
    ) as HTMLInputElement;
    expect(pw.type).toBe("password");
    await fireEvent.click(
      screen.getByRole("button", { name: "Show password" }),
    );
    expect(pw.type).toBe("text");
    expect(confirm.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeTruthy();
  });

  test("a used token rejected by the server swaps to the expired state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: "This link is invalid or has expired." }),
            { status: 400 },
          ),
      ),
    );
    render(ResetPasswordForm, { token: "t.sig", tokenState: "ok" });
    await fireEvent.input(screen.getByLabelText("New password"), {
      target: { value: "long-enough-pass" },
    });
    await fireEvent.input(screen.getByLabelText("Confirm new password"), {
      target: { value: "long-enough-pass" },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: /set new password/i }),
    );
    await waitFor(() =>
      expect(screen.queryByLabelText("New password")).toBeNull(),
    );
    expect(screen.getByText(/invalid or has expired/i)).toBeTruthy();
  });

  test("success shows the sign-in link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ success: true }), { status: 200 }),
      ),
    );
    render(ResetPasswordForm, { token: "t.sig", tokenState: "ok" });
    await fireEvent.input(screen.getByLabelText("New password"), {
      target: { value: "long-enough-pass" },
    });
    await fireEvent.input(screen.getByLabelText("Confirm new password"), {
      target: { value: "long-enough-pass" },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: /set new password/i }),
    );
    await waitFor(() =>
      expect(screen.getByText(/password updated/i)).toBeTruthy(),
    );
  });
});
