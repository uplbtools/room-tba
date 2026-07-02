import { mock } from "bun:test";
import { loadEnv } from "../scripts/load-env";

loadEnv();

const databaseUrl =
  process.env.E2E_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  "";

process.env.DATABASE_URL = databaseUrl;

const adminPassword =
  process.env.E2E_ADMIN_PASSWORD?.trim() || "e2e-test-password-change-me";
const sessionSecret =
  process.env.E2E_ADMIN_SESSION_SECRET?.trim() ||
  process.env.ADMIN_SESSION_SECRET?.trim() ||
  "e2e-integration-session-secret-min-32-chars";

mock.module("astro:env/server", () => ({
  DATABASE_URL: databaseUrl,
  ADMIN_PASSWORD: adminPassword,
  ADMIN_SESSION_SECRET: sessionSecret,
  ISR_BYPASS_TOKEN: process.env.ISR_BYPASS_TOKEN ?? "",
  R2_ACCOUNT_ID: "",
  R2_ACCESS_KEY_ID: "",
  R2_SECRET_ACCESS_KEY: "",
  R2_BUCKET_NAME: "",
  R2_PUBLIC_URL: "",
}));
