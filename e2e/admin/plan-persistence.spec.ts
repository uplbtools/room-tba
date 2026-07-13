import { test, expect } from "@playwright/test";
import { loginAsEditor } from "../helpers/users";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

test.describe("plan persistence (#2)", () => {
  test("unauthenticated requests are rejected", async ({ page }) => {
    const res = await page.request.get("/api/account/plans");
    expect(res.status()).toBe(401);
  });

  test("a signed-in user's planner blob round-trips through the account", async ({
    page,
  }) => {
    await page.goto("/");
    await loginAsEditor(page);

    const blob = {
      v: 1,
      plans: [
        {
          id: "e2e-plan-1",
          label: "E2E Plan",
          termId: E2E_FIXTURES.termId,
          sections: [
            {
              courseCode: "E2E 101",
              section: "A",
              type: "LEC",
              schedule: ["MWF 08:00AM-09:00AM"],
              roomCode: null,
              courseTitle: "E2E Course",
              note: "Dr. Santos",
            },
          ],
        },
      ],
      activePlanIdByTerm: {},
    };

    // Use in-page fetch so the httpOnly admin_session cookie is sent.
    const put = await page.evaluate(async (data) => {
      const res = await fetch("/api/account/plans", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data }),
      });
      return { ok: res.ok, status: res.status };
    }, blob);
    expect(put.ok, `PUT returned ${put.status}`).toBeTruthy();

    const body = (await page.evaluate(async () => {
      const res = await fetch("/api/account/plans", {
        credentials: "same-origin",
      });
      return res.json();
    })) as {
      data?: { plans?: { id?: string; sections?: { note?: string }[] }[] };
    };
    expect(body.data?.plans?.[0]?.id).toBe("e2e-plan-1");
    expect(body.data?.plans?.[0]?.sections?.[0]?.note).toBe("Dr. Santos");
  });
});
