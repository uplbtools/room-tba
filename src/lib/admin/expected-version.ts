export function missingVersionResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "Missing or invalid version. Reload the page and try again.",
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export function parseRequiredEditorVersion(
  version: unknown,
): { ok: true; version: number } | { ok: false; response: Response } {
  if (!Number.isInteger(version)) {
    return { ok: false, response: missingVersionResponse() };
  }
  return { ok: true, version: version as number };
}
