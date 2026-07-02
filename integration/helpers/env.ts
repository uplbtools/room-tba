import { loadEnv } from "../../scripts/load-env";

/** Shared integration/E2E preview env (see docs/testing.md). */
loadEnv();

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

/** Astro rejects cross-site FormData POSTs without Origin (403). */
export function previewOrigin(): string {
  return PREVIEW_BASE.replace(/\/$/, "");
}

export function previewFetchInit(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  if (!headers.has("Origin")) {
    headers.set("Origin", previewOrigin());
  }
  return { ...init, headers };
}

export async function isPreviewUp(
  base: string = PREVIEW_BASE,
): Promise<boolean> {
  try {
    const res = await fetch(`${base}/api/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Fail fast when HTTP integration needs astro preview. */
export async function requirePreview(
  base: string = PREVIEW_BASE,
): Promise<void> {
  if (await isPreviewUp(base)) return;
  throw new Error(
    [
      `Preview not running at ${base}.`,
      "Service/DB integration tests can run without preview; HTTP tests cannot.",
      "Run: bun run test:integration:live",
      "Or: bun run build:e2e && SKIP_E2E_BUILD=1 bun run preview:e2e (separate terminal), then bun run test:integration",
    ].join("\n"),
  );
}
