import { defineConfig } from "@playwright/test";
import { loadEnv } from "./scripts/load-env";

loadEnv([".env.staging"]);

export default defineConfig({
  testDir: "e2e/staging",
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL:
      process.env.STAGING_BASE_URL ?? "https://staging.room-tba.uplbtools.me",
    trace: "on-first-retry",
  },
});
