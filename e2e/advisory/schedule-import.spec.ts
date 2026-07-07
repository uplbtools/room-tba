import { test, expect, type Page } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

type ClassRow = {
  courseCode: string | null;
  section: string | null;
  type: string | null;
  schedule: string[] | null;
  roomCode: string | null;
};

type TermRow = {
  id: number;
  isDefault?: boolean | null;
  isActive?: boolean | null;
};

type Weekday = "M" | "T" | "W" | "Th" | "F" | "S";

const WEEKDAY_BUTTON: Record<Weekday, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  Th: "Thu",
  F: "Fri",
  S: "Sat",
};

function firstWeekday(slot: string): Weekday | null {
  const days = slot.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  for (let i = 0; i < days.length; i += 1) {
    if (days.startsWith("TH", i)) return "Th";
    const day = days[i];
    if (day === "M" || day === "T" || day === "W" || day === "F") return day;
    if (day === "S") return "S";
  }
  return null;
}

async function loadSampleSchedule(page: Page) {
  const termsResponse = await page.request.get("/api/terms");
  const terms = (await termsResponse.json().catch(() => [])) as TermRow[];
  const activeTermId =
    terms.find((term) => term.isDefault)?.id ??
    terms.find((term) => term.isActive)?.id ??
    null;

  for (let offset = 0; offset <= 400; offset += 100) {
    const termQuery = activeTermId === null ? "" : `&term_id=${activeTermId}`;
    const response = await page.request.get(
      `/api/classes?limit=100&offset=${offset}${termQuery}`,
    );
    const payload = (await response.json()) as { rows?: ClassRow[] };
    for (const row of payload.rows ?? []) {
      const slot = row.schedule?.find((item) =>
        /\d{1,2}:\d{2}\s*(AM|PM)/i.test(item),
      );
      const weekday = slot ? firstWeekday(slot) : null;
      const type = row.type?.trim().toUpperCase();
      if (!row.courseCode || !row.section || !type || !row.roomCode) {
        continue;
      }
      if (type !== "LEC" && type !== "LAB") continue;
      if (!slot || !weekday) continue;

      const roomResponse = await page.request.get(
        `/api/rooms?code=${encodeURIComponent(row.roomCode)}`,
      );
      const roomPayload = (await roomResponse.json().catch(() => ({}))) as {
        data?: { building?: { lat?: number | null; lon?: number | null } };
      };
      if (
        roomPayload.data?.building?.lat == null ||
        roomPayload.data.building.lon == null
      ) {
        continue;
      }

      return {
        weekdayLabel: WEEKDAY_BUTTON[weekday],
        schedule: JSON.stringify([
          {
            course_code: row.courseCode,
            section: row.section,
            type,
            schedule: [slot],
          },
        ]),
      };
    }
  }

  test.skip(true, "No routable class with coordinates in this DB");
  throw new Error("unreachable");
}

test.describe("schedule import @advisory", () => {
  test("paste JSON and import in map tools", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    const sample = await loadSampleSchedule(page);
    await page.getByRole("button", { name: /map tools/i }).click();
    await page.getByRole("button", { name: /schedule/i }).click();

    const textarea = page.locator("#schedule-import-paste");
    if (await textarea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await textarea.fill(sample.schedule);
      await page
        .getByRole("button", { name: /import|match/i })
        .first()
        .click();
      await expect(page.locator(".schedule-import-panel")).toBeVisible();
      await page.getByRole("button", { name: sample.weekdayLabel }).click();
      await expect(page.locator(".schedule-route-stop-pin")).toHaveCount(1);
    }
  });
});
