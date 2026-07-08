/** Up to two uppercase initials from a display name ("Juan Dela Cruz" -> "JD"). */
export function nameInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w));
  if (words.length === 0) return "?";
  if (words.length === 1) {
    return (words[0]?.slice(0, 2) ?? "?").toUpperCase();
  }
  const first = words[0]?.[0] ?? "";
  const last = words[words.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

/** Deterministic HSL background for a name, so the same person keeps one color. */
export function nameColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 42%)`;
}
