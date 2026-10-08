import { test, expect } from "@playwright/test";
import { createSignedToken } from "../../src/lib/admin/signed-token-core";

const sessionSecret =
  process.env.E2E_ADMIN_SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET;

// Regression: /reset-password once SSR-crashed (window read during render) and
// the empty 200 was ISR-cached, so every reset link opened a blank page.
test.describe("reset password page", () => {
  test("server renders the heading with no-store caching", async ({
    request,
  }) => {
    const res = await request.get("/reset-password?token=abc.def");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("no-store");
    const html = await res.text();
    expect(html).toContain("Reset your password");
    expect(html).toContain("invalid or has expired");
  });

  test("a bad token shows the expired error and no form", async ({ page }) => {
    await page.goto("/reset-password?token=not-a-real-token");
    await expect(
      page.getByRole("heading", { name: "Reset your password" }),
    ).toBeVisible();
    await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
    await expect(page.getByLabel("New password", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("link", { name: "Go to sign in" }),
    ).toBeVisible();
  });

  test("no token explains the link is incomplete", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(
      page.getByRole("heading", { name: "Reset your password" }),
    ).toBeVisible();
    await expect(page.getByText(/missing its token/i)).toBeVisible();
  });

  test("a well-signed token shows the form with confirm and show toggle", async ({
    page,
  }) => {
    test.skip(!sessionSecret, "needs E2E_ADMIN_SESSION_SECRET to sign a token");
    const token = createSignedToken(
      { purpose: "password-reset", userId: 1, pwFp: "x" },
      600,
      sessionSecret as string,
    );
    await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
    await expect(
      page.getByRole("heading", { name: "Reset your password" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("New password", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Confirm new password")).toBeVisible();
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(
      page.getByLabel("New password", { exact: true }),
    ).toHaveAttribute("type", "text");
  });
});
