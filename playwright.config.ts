import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "./scripts/load-env";

loadEnv();

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4321";
const workers = process.env.PLAYWRIGHT_WORKERS
  ? Number(process.env.PLAYWRIGHT_WORKERS)
  : 2;

export default defineConfig({
  testDir: "e2e",
  testIgnore: ["**/staging/**", "**/advisory/**"],
  timeout: 90_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    storageState: {
      cookies: [],
      origins: [
        {
          origin: baseURL.replace(/\/$/, ""),
          localStorage: [{ name: "hideLandingModal", value: "true" }],
        },
      ],
    },
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
      grepInvert: /@desktop-only/,
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "bun run serve:e2e",
        url: `${baseURL}/api/health`,
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
        timeout: 180_000,
      },
});
