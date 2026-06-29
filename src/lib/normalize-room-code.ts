export function normalizeRoomCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[_\-\s]+/g, " ");
}

export function canonicalKey(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[_\-\s.]+/g, "");
}
