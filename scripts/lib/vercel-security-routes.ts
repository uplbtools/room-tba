/** Build Output API routes that only add headers and fall through. */
export type HeaderRoute = {
  src: string;
  headers: Record<string, string>;
  continue: true;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildSecurityRoutes(input: {
  headers: Readonly<Record<string, string>>;
  noReferrerPaths: readonly string[];
  noStorePrefixes: readonly string[];
  noStoreValue: string;
}): HeaderRoute[] {
  return [
    { src: "^/.*$", headers: { ...input.headers }, continue: true },
    ...input.noReferrerPaths.map((path) => ({
      src: `^${escapeRegex(path)}(?:/.*)?$`,
      headers: { "Referrer-Policy": "no-referrer" },
      continue: true as const,
    })),
    ...input.noStorePrefixes.map((prefix) => ({
      src: `^${escapeRegex(prefix)}.*$`,
      headers: { "Cache-Control": input.noStoreValue },
      continue: true as const,
    })),
  ];
}
