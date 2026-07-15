import { PUBLIC_APP_ENV } from "astro:env/client";

export type AppEnv = "staging" | "production";

/** Testable without Astro env wiring. */
export function isStagingAppEnv(value: string | undefined): boolean {
  return value === "staging";
}

export function isStagingApp(): boolean {
  return isStagingAppEnv(PUBLIC_APP_ENV);
}
