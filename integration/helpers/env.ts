import { config } from "dotenv";

config({ path: ".env" });

const E2E_PROJECT_REF = "yhzinxlakcewqjaqbbaj";

export function integrationDatabaseUrl(): string | null {
  const url =
    process.env.E2E_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  if (!url || !url.includes(E2E_PROJECT_REF)) return null;
  return url;
}

export function integrationPassword(): string {
  return (
    process.env.E2E_ADMIN_PASSWORD?.trim() || "e2e-test-password-change-me"
  );
}

export function skipWithoutE2eDb(): boolean {
  return integrationDatabaseUrl() === null;
}

export const PREVIEW_BASE =
  process.env.PREVIEW_BASE_URL ?? "http://127.0.0.1:4321";
